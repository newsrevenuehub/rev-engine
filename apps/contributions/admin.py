from django.contrib import admin

from apps.contributions.models import Contribution, Contributor


class ContributionsCountFilter(admin.SimpleListFilter):
    title = "contributions_count"
    parameter_name = "contributions_count"

    def lookups(self, request, model_admin):
        return ((0, "0"), (1, "1"), (2, "2-5"), (3, "5-10"), (4, "> 10"))

    def queryset(self, request, queryset):
        value = self.value()
        if value == 0:
            return queryset.filter(contributions_count=0)
        if value == 1:
            return queryset.filter(contributions_count=1)
        if value == 2:
            return queryset.filter(contributions_count__gte=2, contributions_count__lte=5)
        if value == 3:
            return queryset.filter(contributions_count__gte=6, contributions_count__lte=10)
        if value == 3:
            return queryset.filter(contributions_count__gt=10)


class QuarantinedContributionsCountFilter(admin.SimpleListFilter):
    title = "quarantined_contributions_count"
    parameter_name = "quarantined_contributions_count"

    def lookups(self, request, model_admin):
        return ((0, "0"), (1, "1-2"), (2, "3-5"), (3, "> 5"))

    def queryset(self, request, queryset):
        value = self.value()
        if value == 0:
            return queryset.filter(quarantined_contributions_count=0)
        if value == 1:
            return queryset.filter(
                quarantined_contributions_count__gte=1, quarantined_contributions_count__lte=2
            )
        if value == 2:
            return queryset.filter(
                quarantined_contributions_count__gte=3, quarantined_contributions_count__lte=5
            )
        if value == 3:
            return queryset.filter(quarantined_contributions_count__gt=5)


@admin.register(Contributor)
class ContributorAdmin(admin.ModelAdmin):
    list_display = (
        "email",
        "contributions_count",
        "quarantined_contributions_count",
        "most_recent_contribution",
        "most_recent_contribution_date",
    )
    list_filter = (
        "email",
        ContributionsCountFilter,
        QuarantinedContributionsCountFilter,
    )
    ordering = ("email",)
    search_fields = ("email",)

    readonly_fields = (
        "email",
        "contributions_count",
        "quarantined_contributions_count",
        "most_recent_contribution",
        "most_recent_contribution_date",
    )


@admin.register(Contribution)
class ContributionAdmin(admin.ModelAdmin):
    list_display = (
        "organization",
        "contributor",
        "formatted_amount",
        "donation_page",
        "payment_state",
        "is_quarantined",
        "modified",
        "created",
    )

    list_filter = (
        "organization__name",
        "contributor__email",
        "donation_page__name",
        "payment_state",
        "is_quarantined",
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
    )

    readonly_fields = (
        "payment_provider_data",
        "provider_reference_id",
    )
