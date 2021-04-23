from django.contrib import admin

from apps.organizations.models import Feature, Organization, Plan, RevenueProgram


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    organization_fieldset = (
        ("Organization", {"fields": ("name", "slug", "project_manager")}),
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

    fieldsets = organization_fieldset


@admin.register(RevenueProgram)
class RevenueProgramAdmin(admin.ModelAdmin):
    pass


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    pass


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    pass
