from django.conf import settings
from django.contrib import admin, messages
from django.utils.html import format_html

from reversion.admin import VersionAdmin

from apps.common.admin import RevEngineBaseAdmin
from apps.contributions.models import Contribution, ContributionStatus, Contributor
from apps.contributions.payment_managers import PaymentProviderError


@admin.register(Contributor)
class ContributorAdmin(RevEngineBaseAdmin, VersionAdmin):
    list_display = (
        "email",
        "contributions_count",
        "most_recent_contribution",
    )
    list_filter = ("email",)

    ordering = ("email",)

    search_fields = ("email",)

    readonly_fields = (
        "email",
        "contributions_count",
        "most_recent_contribution",
    )


@admin.register(Contribution)
class ContributionAdmin(RevEngineBaseAdmin, VersionAdmin):
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
        ("Bad Actor", {"fields": ("bad_actor_score", "bad_actor_response")}),
        (
            "Provider",
            {
                "fields": (
                    "status",
                    "payment_provider_used",
                    "provider_payment_link",
                    "provider_subscription_link",
                    "provider_customer_link",
                    "payment_provider_data",
                    "provider_payment_method_id",
                    "provider_payment_method_details",
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
        "revenue_program",
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
        "bad_actor_response",
        "status",
        "payment_provider_used",
        "provider_payment_link",
        "provider_subscription_link",
        "provider_customer_link",
        "provider_payment_method_id",
        "payment_provider_data",
        "flagged_date",
        "provider_payment_method_details",
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
            self.message_user(
                request,
                f"Cannot {action} a non-flagged Contribution.",
                messages.ERROR,
            )

        succeeded = 0
        failed = []
        for contribution in queryset:
            try:
                contribution.process_flagged_payment(reject=reject)
                succeeded += 1
            except PaymentProviderError:
                failed.append(contribution)

        if succeeded:
            self.message_user(
                request,
                f"Successfully {action}ed {succeeded} payments. Payment state may not immediately reflect change of payment status.",
                messages.SUCCESS,
            )

        if failed:
            self.message_user(
                request,
                f"Could not complete action for contributions: {', '.join([str(cont) for cont in failed])}",
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

    def _generate_stripe_connect_link(self, slug, provider_id, stripe_account_id):
        if provider_id:
            test_mode = "test/" if not settings.STRIPE_LIVE_MODE else ""
            return format_html(
                f"<a href='%s' target='_blank'>{provider_id}</a>"
                % f"https://dashboard.stripe.com/{test_mode}connect/accounts/{stripe_account_id}/{slug}/{provider_id}"
            )
        return "-"
