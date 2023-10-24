import logging

from django.conf import settings
from django.contrib import admin, messages
from django.utils.html import format_html

from reversion_compare.admin import CompareVersionAdmin

from apps.common.admin import RevEngineBaseAdmin, prettify_json_field
from apps.contributions.models import Contribution, ContributionStatus, Contributor, Payment
from apps.contributions.payment_managers import PaymentProviderError


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@admin.register(Contributor)
class ContributorAdmin(RevEngineBaseAdmin, CompareVersionAdmin):
    list_display = ("email",)
    list_filter = ("email",)
    ordering = ("email",)
    search_fields = ("email",)
    readonly_fields = ("email",)


class AbstractStripeLinkedAdmin:
    def _generate_stripe_connect_link(self, slug, provider_id, stripe_account_id):
        if provider_id:
            test_mode = "test/" if not settings.STRIPE_LIVE_MODE else ""
            return format_html(
                f"<a href='%s' target='_blank'>{provider_id}</a>"
                % f"https://dashboard.stripe.com/{test_mode}connect/accounts/{stripe_account_id}/{slug}/{provider_id}"
            )
        return "-"

    def _generate_stripe_as_connected_account_link(self, slug, provider_id, stripe_account_id):
        if provider_id:
            test_mode = "test/" if not settings.STRIPE_LIVE_MODE else ""
            return format_html(
                f"<a href='%s' target='_blank'>{provider_id}</a>"
                % f"https://dashboard.stripe.com/{stripe_account_id}/{test_mode}{slug}/{provider_id}"
            )
        # This is not an expected state to get into because provider_id is expected to be a required field
        return "-"  # pragma: no cover


@admin.register(Payment)
class PaymentAdmin(RevEngineBaseAdmin, AbstractStripeLinkedAdmin):
    list_display = ("contribution", "net_amount_paid", "gross_amount_paid", "amount_refunded")
    order = (
        "modified",
        "created",
        "contribution",
        "net_amount_paid",
        "gross_amount_paid",
        "amount_refunded",
    )
    fields = (
        fields := (
            "id",
            "created",
            "modified",
            "contribution",
            "net_amount_paid",
            "gross_amount_paid",
            "amount_refunded",
            "stripe_balance_transaction_id",
            "provider_charge_link",
            "provider_event_link",
        )
    )
    readonly_fields = fields

    def provider_charge_link(self, obj: Payment) -> str:
        """Link to the charge in Stripe"""
        return self._generate_stripe_as_connected_account_link("payments", obj.stripe_charge_id, obj.stripe_account_id)

    def provider_event_link(self, obj: Payment) -> str:
        """Link to the event in Stripe"""
        return self._generate_stripe_as_connected_account_link("events", obj.stripe_event_id, obj.stripe_account_id)


@admin.register(Contribution)
class ContributionAdmin(RevEngineBaseAdmin, CompareVersionAdmin, AbstractStripeLinkedAdmin):
    fieldsets = (
        (
            "Payment",
            {
                "fields": (
                    "amount",
                    "currency",
                    "reason",
                    "interval",
                    "revenue_program",
                )
            },
        ),
        ("Relations", {"fields": ("contributor", "donation_page")}),
        ("Bad Actor", {"fields": ("bad_actor_score", "bad_actor_response_pretty")}),
        (
            "Provider",
            {
                "fields": (
                    "status",
                    "payment_provider_used",
                    "provider_payment_link",
                    "provider_subscription_link",
                    "provider_setup_intent_id",
                    "provider_customer_link",
                    "payment_provider_data_pretty",
                    "provider_payment_method_id",
                    "provider_payment_method_details_pretty",
                ),
            },
        ),
        (
            "Metadata",
            {"fields": ("contribution_metadata",)},
        ),
    )

    list_display = (
        "formatted_amount",
        "revenue_program",
        "contributor",
        "donation_page",
        "interval",
        "status",
        "bad_actor_score",
        "created",
        "modified",
    )

    list_filter = (
        "donation_page__revenue_program",
        "interval",
        "donation_page__name",
        "status",
        "bad_actor_score",
        "modified",
        "created",
    )

    order = (
        "modified",
        "created",
    )

    search_fields = (
        "donation_page__revenue_program__name",
        "contributor__email",
        "donation_page__name",
        "modified",
        "created",
    )

    readonly_fields = (
        "amount",
        "currency",
        "reason",
        "interval",
        "contributor",
        "donation_page",
        "revenue_program",
        "bad_actor_score",
        "bad_actor_response_pretty",
        "status",
        "payment_provider_used",
        "provider_payment_link",
        "provider_subscription_link",
        "provider_customer_link",
        "provider_payment_method_id",
        "payment_provider_data_pretty",
        "flagged_date",
        "provider_setup_intent_id",
        "provider_payment_method_details_pretty",
    )

    actions = (
        "accept_flagged_contribution",
        "reject_flagged_contribution",
    )

    @admin.action(description="Accept flagged contributions")
    def accept_flagged_contribution(self, request, queryset):
        self._process_flagged_payment(request, queryset, reject=False)

    @admin.action(description="Reject flagged contributions")
    def reject_flagged_contribution(self, request, queryset):
        self._process_flagged_payment(request, queryset, reject=True)

    def _process_flagged_payment(self, request, queryset, reject=False):
        # Bail if any of the selected Contributions are not "FLAGGED"
        action = "reject" if reject else "accept"
        if queryset.exclude(status=ContributionStatus.FLAGGED).exists():
            logger.error(
                "ContributionAdmin._process_flagged_payment - Unable to process flagged payments when flagged "
                "contribution is selected"
            )
            self.message_user(
                request,
                f"Cannot {action} a non-flagged Contribution.",
                messages.ERROR,
            )
            return

        succeeded = 0
        failed = []
        for contribution in queryset:
            try:
                contribution.process_flagged_payment(reject=reject)
                succeeded += 1
            except PaymentProviderError:
                failed.append(contribution)

        if succeeded:
            logger.info("ContributionAdmin._process_flagged_payment - processing successfully complete")
            self.message_user(
                request,
                f"Successfully {action}ed {succeeded} payments. Payment state may not immediately reflect change of payment status.",
                messages.SUCCESS,
            )

        if failed:
            error_message = ", ".join([str(cont) for cont in failed])
            logger.error("ContributionAdmin._process_flagged_payment - %s", error_message)
            self.message_user(
                request,
                f"Could not complete action for contributions: {error_message}",
                messages.ERROR,
            )

    def provider_payment_link(self, request):
        return self._generate_stripe_connect_link("payments", request.provider_payment_id, request.stripe_account_id)

    def provider_subscription_link(self, request):
        return self._generate_stripe_connect_link(
            "subscriptions", request.provider_subscription_id, request.stripe_account_id
        )

    def provider_customer_link(self, request):
        return self._generate_stripe_connect_link("customers", request.provider_customer_id, request.stripe_account_id)

    def bad_actor_response_pretty(self, instance):
        """Render bad_actor_response field with pretty formatting"""
        return prettify_json_field(instance.bad_actor_response)

    bad_actor_response_pretty.short_description = "Bad actor response"

    def payment_provider_data_pretty(self, instance):
        """Render payment_provider_data field with pretty formatting"""
        return prettify_json_field(instance.payment_provider_data)

    payment_provider_data_pretty.short_description = "Payment provider data"

    def provider_payment_method_details_pretty(self, instance):
        """Render provider_payment_method_details field with pretty formatting"""
        return prettify_json_field(instance.provider_payment_method_details)

    provider_payment_method_details_pretty.short_description = "Provider payment method details"
