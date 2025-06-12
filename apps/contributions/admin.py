import logging
from datetime import timedelta

from django.conf import settings
from django.contrib import admin, messages
from django.contrib.admin import ModelAdmin
from django.db.models import Min, QuerySet
from django.http import HttpRequest, HttpResponseRedirect
from django.urls import re_path, reverse
from django.urls.resolvers import URLPattern
from django.utils.html import format_html
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _

from apps.common.admin import RevEngineBaseAdmin, prettify_json_field
from apps.contributions.choices import QuarantineStatus
from apps.contributions.models import Contribution, ContributionStatus, Contributor, Payment
from apps.contributions.payment_managers import PaymentProviderError


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


def flagged_contribution_actions_html(obj: Contribution):
    """Return HTML to take quick actions on a flagged contribution.

    This is shared across the quarantine queue and contribution admins.
    """
    mapping = [
        {
            "label": "✅ appr",
            "url": reverse("admin:approve_quarantined_contribution", args=[obj.id]),
            "class": "approve",
        },
        {
            "label": "❌ dupe",
            "url": reverse(
                "admin:reject_quarantined_contribution",
                args=[obj.id, QuarantineStatus.REJECTED_BY_HUMAN_DUPE.value],
            ),
            "class": "reject",
        },
        {
            "label": "❌ fraud",
            "url": reverse(
                "admin:reject_quarantined_contribution",
                args=[obj.id, QuarantineStatus.REJECTED_BY_HUMAN_FRAUD.value],
            ),
            "class": "reject",
        },
        {
            "label": "❌ other",
            "url": reverse(
                "admin:reject_quarantined_contribution",
                args=[obj.id, QuarantineStatus.REJECTED_BY_HUMAN_OTHER.value],
            ),
            "class": "reject",
        },
    ]

    actions = [f"""<a class="button {x["class"]}" href="{x["url"]}">{x["label"]}</a>""" for x in mapping]
    return format_html(
        f"""<div class="quarantine-item-button-group">{"".join(actions)}</div>""",
    )


@admin.register(Contributor)
class ContributorAdmin(RevEngineBaseAdmin):
    list_display = ("email",)
    list_filter = ("email",)
    ordering = ("email",)
    search_fields = ("email",)
    readonly_fields = (
        "email",
        "email_future",
    )


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


class FirstPaymentDateFilter(admin.SimpleListFilter):
    """Cannot use DateFieldListFilter for built-in date filter because this is not a field, it's an annotation."""

    title = _("First Payment Date")
    parameter_name = "first_payment_date"

    def lookups(self, request: HttpRequest, model_admin: ModelAdmin):
        return [
            ("today", _("Today")),
            ("past_week", _("Past 7 days")),
            ("this_month", _("This month")),
            ("this_year", _("This year")),
            ("no_date", _("No Payment Date")),
        ]

    def queryset(self, request: HttpRequest, queryset: QuerySet[Contribution]):
        queryset = queryset.annotate(first_payment_date=Min("payment__transaction_time"))
        filter_value = self.value()
        match filter_value:
            case "today":
                return queryset.filter(first_payment_date__date=now().date())
            case "past_week":
                return queryset.filter(first_payment_date__gte=now() - timedelta(days=7))
            case "this_month":
                return queryset.filter(first_payment_date__year=now().year, first_payment_date__month=now().month)
            case "this_year":
                return queryset.filter(first_payment_date__year=now().year)
            case "no_date":
                return queryset.filter(first_payment_date__isnull=True)
        return queryset


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
                    "quarantine_status",
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
        "quarantine_status",
        "bad_actor_score",
        "first_payment_date_display",
        "modified",
    )

    list_filter = (
        "interval",
        "donation_page__name",
        "status",
        "quarantine_status",
        "bad_actor_score",
        "modified",
        FirstPaymentDateFilter,
    )

    order = (
        "modified",
        "first_payment_date_display",
    )

    search_fields = (
        "donation_page__revenue_program__name",
        "contributor__email",
        "donation_page__name",
        "modified",
        "created",
        "first_payment_date",
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
        "quarantine_status",
        "reason",
        "_revenue_program",
        "revenue_program",
        "status",
    )

    inlines = [PaymentInline]

    class Media:
        css = {"all": ("admin/css/quarantine-admin.css",)}

    def quarantine_actions(self, obj: Contribution):
        return flagged_contribution_actions_html(obj)

    quarantine_actions.short_description = "Resolve"
    quarantine_actions.allow_tags = True

    def get_fieldsets(self, request: HttpRequest, obj: Contribution):
        # Add quarantine options to flagged contributions.
        if obj.status == ContributionStatus.FLAGGED:
            return (
                (
                    "Quarantine",
                    {"fields": ("quarantine_actions",)},
                ),
            )
        return self.fieldsets

    def get_queryset(self, request: HttpRequest) -> QuerySet[Contribution]:
        # Annotate the queryset with the first_payment_date
        queryset = super().get_queryset(request)
        return queryset.with_first_payment_date()

    def first_payment_date_display(self, obj):
        return obj.first_payment_date

    first_payment_date_display.short_description = "First Payment Date"

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

    actions = [
        "approve_quarantined_contribution_action",
        "reject_for_duplicate",
        "reject_for_fraud",
        "reject_for_other",
    ]
    list_display = [
        "contribution",
        "resolve_field",
        "flagged_date",
        "amount",
        "interval",
        "name",
        "email",
        "address",
        "_reason",
        "rp",
    ]

    list_filter = [
        "interval",
    ]

    ordering = (
        "contributor__email_future",
        "created",
    )

    class Media:
        css = {"all": ("admin/css/quarantine-admin.css",)}

    def has_delete_permission(self, request):
        return False

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.action(description="Approve")
    def approve_quarantined_contribution_action(self, request: HttpRequest, queryset: QuerySet[Contribution]) -> None:
        for obj in queryset:
            try:
                obj.process_flagged_payment(
                    reject=False,
                    new_quarantine_status=QuarantineStatus.APPROVED_BY_HUMAN,
                )
            except PaymentProviderError as exc:
                self.message_user(
                    request,
                    f"Could not complete action for contributions: {exc}",
                    messages.ERROR,
                )
            else:
                self.message_user(request, "Successfully approved quarantined contributions", messages.SUCCESS)

    def _reject(self, request: HttpRequest, queryset: QuerySet[Contribution], quarantine_status: QuarantineStatus):
        for obj in queryset:
            try:
                obj.process_flagged_payment(
                    reject=True,
                    new_quarantine_status=quarantine_status,
                )
            except PaymentProviderError as exc:
                self.message_user(
                    request,
                    f"Could not complete action for contributions: {exc}",
                    messages.ERROR,
                )
            else:
                self.message_user(request, "Successfully rejected quarantined contributions", messages.SUCCESS)

    @admin.action(description="Reject - Duplicate")
    def reject_for_duplicate(self, request: HttpRequest, queryset: QuerySet[Contribution]) -> None:
        self._reject(
            request,
            queryset,
            quarantine_status=QuarantineStatus.REJECTED_BY_HUMAN_DUPE,
        )

    @admin.action(description="Reject - Fraud")
    def reject_for_fraud(self, request: HttpRequest, queryset: QuerySet[Contribution]) -> None:
        self._reject(
            request,
            queryset,
            quarantine_status=QuarantineStatus.REJECTED_BY_HUMAN_FRAUD,
        )

    @admin.action(description="Reject - Other")
    def reject_for_other(self, request: HttpRequest, queryset: QuerySet[Contribution]) -> None:
        self._reject(
            request,
            queryset,
            quarantine_status=QuarantineStatus.REJECTED_BY_HUMAN_OTHER,
        )

    def get_urls(self) -> list[URLPattern]:
        urls = super().get_urls()
        custom_urls = [
            re_path(
                r"^approve_quarantined_contribution/(?P<contribution_id>.+)/$",
                self.admin_site.admin_view(self.approve_quarantined_contribution),
                name="approve_quarantined_contribution",
            ),
            re_path(
                r"^reject_quarantined_contribution/(?P<contribution_id>.+)/(?P<status>.+)/$",
                self.admin_site.admin_view(self.reject_quarantined_contribution),
                name="reject_quarantined_contribution",
            ),
        ]
        return custom_urls + urls

    def resolve_field(self, obj: Contribution):
        return flagged_contribution_actions_html(obj)

    resolve_field.short_description = "Resolve"
    resolve_field.allow_tags = True

    def approve_quarantined_contribution(self, request, contribution_id):
        return self.complete_flagged_contribution(request, contribution_id, QuarantineStatus.APPROVED_BY_HUMAN)

    def reject_quarantined_contribution(self, request, contribution_id, status):
        return self.complete_flagged_contribution(request, contribution_id, status)

    def contribution(self, obj):
        url = reverse("admin:contributions_contribution_change", args=[obj.id])
        return format_html('<a href="{}">{}</a>', url, obj.id)

    def name(self, obj):
        if obj.bad_actor_response:
            return next((x for x in obj.bad_actor_response["items"] if x["label"] == "name"), {}).get("value")

    def email(self, obj: Contribution) -> str | None:
        # TODO @BW: Remove conditionality around contributor with DEV-5393
        # DEV-5393
        if contributor := getattr(obj, "contributor", None):
            return contributor.email_future or contributor.email
        return None

    def address(self, obj):
        if obj.bad_actor_response:
            return next((x for x in obj.bad_actor_response["items"] if x["label"] == "address"), {}).get("value")

    def rp(self, obj):
        return obj.revenue_program.name

    # There is a Contribution.reason field that is largely unused, but that creates a collision here, so we need `._reason`
    # TODO @BW: Change to `reason` once the Contribution.reason field is removed
    # DEV-4922
    def _reason(self, obj):
        return obj.contribution_metadata.get("reason_for_giving") if obj.contribution_metadata else None

    _reason.short_description = "Reason"

    def get_queryset(self, request: HttpRequest) -> QuerySet[Contribution]:
        return (
            super()
            .get_queryset(request)
            .filter(quarantine_status=QuarantineStatus.FLAGGED_BY_BAD_ACTOR, status=ContributionStatus.FLAGGED)
        )

    def complete_flagged_contribution(self, request: HttpRequest, contribution_id: str, quarantine_status: str):
        try:
            con = Contribution.objects.get(id=contribution_id)
        except Contribution.DoesNotExist:
            self.message_user(request, "Contribution not found", messages.ERROR)
            return HttpResponseRedirect(reverse("admin:contributions_quarantine_changelist"))
        if quarantine_status == QuarantineStatus.APPROVED_BY_HUMAN.value:
            self.approve_quarantined_contribution_action(request, [con])
        else:
            self._reject(
                request,
                [con],
                quarantine_status=QuarantineStatus(quarantine_status),
            )
        return HttpResponseRedirect(reverse("admin:contributions_quarantine_changelist"))
