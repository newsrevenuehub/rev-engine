from pathlib import Path

from django.contrib import admin

from apps.organizations.models import Feature, Organization, Plan, RevenueProgram
from apps.users.admin import UserOrganizationInline


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    fieldsets = (
        ("Organization", {"fields": ("name", "slug")}),
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
        ("Plan", {"fields": ("non_profit", "plan", "stripe_account", "salesforce_id")}),
    )

    list_display = ["name", "slug", "plan", "org_state"]

    list_filter = ["name", "plan", "org_state"]

    inlines = [UserOrganizationInline]

    def get_readonly_fields(self, request, obj=None):
        if Path(request.path).parts[-1] == "add":
            return []
        return ["name", "slug"]


@admin.register(RevenueProgram)
class RevenueProgramAdmin(admin.ModelAdmin):
    fieldsets = (("RevenueProgram", {"fields": ("name", "slug", "organization")}),)

    list_display = ["name", "slug"]

    list_filter = ["name"]

    def get_readonly_fields(self, request, obj=None):
        if Path(request.path).parts[-1] == "add":
            return []
        return ["name", "slug", "organization"]


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    fieldsets = (("Plan", {"fields": ("name",)}),)

    list_display = ["name"]

    list_filter = ["name"]


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    fieldsets = (("Feature", {"fields": ("name", "description", "plans")}),)

    list_display = ["name"]

    list_filter = ["name"]
