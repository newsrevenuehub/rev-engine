from django.contrib import admin, messages

from apps.common.admin import RevEngineBaseAdmin
from apps.contributions.models import Contribution, ContributionStatus, Contributor
from apps.contributions.payment_managers import PaymentProviderError


@admin.register(Contributor)
class ContributorAdmin(RevEngineBaseAdmin):
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


class BadActorScoreFilter(admin.SimpleListFilter):
    title = "bad_actor_score"
    parameter_name = "bad_actor_score"

    def lookups(self, request, model_admin):
        return Contribution.BAD_ACTOR_SCORES

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(bad_actor_score=self.value())
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
                )
            },
        ),
        ("Relations", {"fields": ("contributor", "donation_page", "organization")}),
        ("Bad Actor", {"fields": ("bad_actor_score", "bad_actor_response")}),
        (
            "Provider",
            {
                "fields": (
                    "status",
                    "payment_provider_used",
                    "provider_payment_id",
                    "provider_customer_id",
                    "provider_payment_method_id",
                    "payment_provider_data",
                ),
            },
        ),
    )

    list_display = (
        "formatted_amount",
        "organization",
        "contributor",
        "donation_page",
        "interval",
        "status",
        "expanded_bad_actor_score",
        "created",
        "modified",
    )

    list_filter = (
        "organization__name",
        "contributor__email",
        "donation_page__name",
        "status",
        BadActorScoreFilter,
        "modified",
        "created",
    )

    order = (
        "updated",
        "created",
    )

    search_fields = (
        "organization__name",
        "contributor__email",
        "donation_page__name",
        "updated",
        "created",
    )

    readonly_fields = (
        "amount",
        "currency",
        "reason",
        "interval",
        "contributor",
        "donation_page",
        "organization",
        "bad_actor_score",
        "bad_actor_response",
        "status",
        "payment_provider_used",
        "provider_payment_id",
        "provider_customer_id",
        "provider_payment_method_id",
        "payment_provider_data",
        "flagged_date",
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
