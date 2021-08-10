from pathlib import Path

from django.contrib import admin

from apps.common.admin import RevEngineBaseAdmin
from apps.organizations.models import Feature, Organization, Plan, RevenueProgram
from apps.users.admin import UserOrganizationInline


@admin.register(Organization)
class OrganizationAdmin(RevEngineBaseAdmin):  # pragma: no cover
    organization_fieldset = (
        ("Organization", {"fields": ("name", "slug", "salesforce_id")}),
        (
            "Address",
            {
                "fields": (
                    "org_addr1",
                    "org_addr2",
                    ("org_city", "org_state", "org_zip"),
                )
            },
        ),
        (
            "Plan",
            {
                "fields": (
                    "non_profit",
                    "plan",
                )
            },
        ),
        (
            "Email Templates",
            {"fields": ("uses_email_templates",)},
        ),
        (
            "Payment Provider",
            {
                "fields": (
                    "default_payment_provider",
                    "stripe_account_id",
                    "stripe_verified",
                    "stripe_product_id",
                    "domain_apple_verified_date",
                )
            },
        ),
    )

    fieldsets = organization_fieldset

    list_display = ["name", "slug", "plan", "org_state"]

    list_filter = ["name", "plan", "org_state"]

    inlines = [UserOrganizationInline]

    readonly_fields = ["name", "slug", "stripe_verified"]

    def get_readonly_fields(self, request, obj=None):
        if Path(request.path).parts[-1] == "add":
            return []
        return ["name", "slug"]


@admin.register(RevenueProgram)
class RevenueProgramAdmin(RevEngineBaseAdmin):  # pragma: no cover
    fieldsets = (
        (
            "RevenueProgram",
            {
                "fields": (
                    "name",
                    "slug",
                    "organization",
                    "default_donation_page",
                    "google_analytics_v3_domain",
                    "google_analytics_v3_id",
                    "org_google_analytics_v4_id",
                )
            },
        ),
    )

    list_display = ["name", "slug"]

    list_filter = ["name"]

    def get_readonly_fields(self, request, obj=None):
        if Path(request.path).parts[-1] == "add":
            return []
        return ["name", "slug", "organization"]


@admin.register(Plan)
class PlanAdmin(RevEngineBaseAdmin):  # pragma: no cover
    fieldsets = (("Plan", {"fields": ("name", "features")}),)

    list_display = ["name"]

    list_filter = ["name"]


@admin.register(Feature)
class FeatureAdmin(RevEngineBaseAdmin):  # pragma: no cover
    fieldsets = (("Feature", {"fields": ("name", "feature_type", "feature_value", "description")}),)

    list_display = ["name", "feature_type", "feature_value"]

    list_filter = ["name", "feature_type"]
