import logging

from django.conf import settings
from django.contrib import admin, messages
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html

from apps.common.admin import RevEngineBaseAdmin, prettify_json_field
from apps.contributions.models import Contribution, ContributionStatus, Contributor, Payment
from apps.contributions.payment_managers import PaymentProviderError


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@admin.register(Contributor)
class ContributorAdmin(RevEngineBaseAdmin):
    list_display = ("email",)
    list_filter = ("email",)
    ordering = ("email",)
    search_fields = ("email",)
    readonly_fields = ("email",)


@admin.register(Payment)
class PaymentAdmin(RevEngineBaseAdmin):
    list_display = (
        "contribution",
        "net_amount_paid",
        "gross_amount_paid",
        "amount_refunded",
        "stripe_balance_transaction_id",
    )
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
        )
    )
    readonly_fields = fields
    search_fields = ("contribution__id",)

    def has_add_permission(self, request, obj=None):
        return False


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request, obj):
        return False

    def has_delete_permission(self, request, obj, parent_obj=None):
        return False


@admin.register(Contribution)
class ContributionAdmin(RevEngineBaseAdmin):
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
        (
            "Relations",
            {
                "fields": ("contributor", "donation_page", "_revenue_program"),
                "description": (
                    "Note: a contribution can have a foreign key to donation page OR revenue program, but not both. "
                    "Additionally, there is a `revenue program` property exposed further down that is populated by either "
                    "`._revenue_program` or by `.donation_page.revenue_program`"
                ),
            },
        ),
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
        "bad_actor_response_pretty",
        "bad_actor_score",
        "contribution_metadata",
        "contributor",
        "currency",
        "donation_page",
        "flagged_date",
        "interval",
        "payment_provider_used",
        "provider_customer_link",
        "provider_payment_link",
        "provider_payment_method_details_pretty",
        "provider_payment_method_id",
        "provider_setup_intent_id",
        "provider_subscription_link",
        "reason",
        "_revenue_program",
        "revenue_program",
        "status",
    )

    inlines = [PaymentInline]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

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

    @admin.display(description="Bad actor response")
    def bad_actor_response_pretty(self, instance):
        """Render bad_actor_response field with pretty formatting."""
        return prettify_json_field(instance.bad_actor_response)

    @admin.display(description="Provider payment method details")
    def provider_payment_method_details_pretty(self, instance):
        """Render provider_payment_method_details field with pretty formatting."""
        return prettify_json_field(instance.provider_payment_method_details)

    @admin.display(description="Revenue program (property, not FK)")
    def revenue_program(self, instance):
        """Render revenue_program field with pretty formatting."""
        return instance.revenue_program.name


class Quarantine(Contribution):
    class Meta:
        proxy = True
        verbose_name_plural = "Quarantine"


@admin.register(Quarantine)
class QuarantineQueue(admin.ModelAdmin):
    actions = (
        "accept_flagged_contribution",
        "reject_flagged_contribution",
    )

    list_display = [
        "contribution",
        "hours_in_queue",
        "amount",
        "interval",
        "name",
        "email",
        "address",
        "reason",
        "rp",
    ]

    list_filter = [
        "interval",
    ]

    def has_delete_permission(self, request):
        return False

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def hours_in_queue(self, obj) -> int | None:
        # edge case around flagged date null
        if not obj.flagged_date:
            return None
        return (timezone.now() - obj.flagged_date).days

    def contribution(self, obj):
        url = reverse("admin:contributions_contribution_change", args=[obj.id])
        return format_html('<a href="{}">{}</a>', url, obj.id)

    def name(self, obj):
        if obj.bad_actor_response:
            return next(x for x in obj.bad_actor_response["items"] if x["label"] == "name").get("value")

    def email(self, obj):
        return obj.contributor.email

    def address(self, obj):
        if obj.bad_actor_response:
            return next(x for x in obj.bad_actor_response["items"] if x["label"] == "address").get("value")

    def postal_code(self, obj):
        return obj.stripe_customer.address.postal_code if obj.stripe_customer else None

    def rp(self, obj):
        return obj.revenue_program.name

    def reason(self, obj):
        return obj.contribution_metadata.get("reason")

    def get_queryset(self, request):
        # does this want an index?
        return (
            super()
            .get_queryset(request)
            .filter(status=ContributionStatus.FLAGGED)
            .exclude(id__in=Contribution.objects.unmarked_abandoned_carts())
        )

    @admin.action(description="Accept flagged contributions")
    def accept_flagged_contribution(self, request, queryset):
        self._process_flagged_payment(request, queryset, reject=False)

    @admin.action(description="Reject flagged contributions")
    def reject_flagged_contribution(self, request, queryset):
        self._process_flagged_payment(request, queryset, reject=True)

    def _process_flagged_payment(self, request, queryset, reject=False):

        action = "reject" if reject else "accept"
        succeeded = 0
        failed = {}
        for contribution in queryset:
            contribution.refresh_from_db()
            if contribution.status == ContributionStatus.FLAGGED:
                try:
                    contribution.process_flagged_payment(reject=reject)
                except PaymentProviderError as exc:
                    failed[contribution.id] = str(exc)
                else:
                    succeeded += 1

        if succeeded:
            self.message_user(
                request,
                f"Successfully {action}ed {succeeded} payments. Payment state may not immediately reflect change of payment status.",
                messages.SUCCESS,
            )

        if failed:
            error_message = ", ".join(f"{k}: {v}" for k, v in failed.items())
            self.message_user(
                request,
                f"Could not complete action for contributions: {error_message}",
                messages.ERROR,
            )
