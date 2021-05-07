from django.contrib import admin

from apps.contributions.models import Contribution, Contributor


@admin.register(Contributor)
class ContributorAdmin(admin.ModelAdmin):
    list_display = (
        "email",
        "contributions_count",
        "quarantined_contributions_count",
        "most_recent_contribution",
        "most_recent_contribution_date",
    )
    list_filter = ("email",)

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
