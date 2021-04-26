from django.contrib import admin

from apps.organizations.models import Feature, Organization, Plan, RevenueProgram


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    organization_fieldset = (
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

    readonly_fields = ["slug"]

    list_display = ["name", "slug", "plan", "org_state"]

    list_filter = ["name", "plan", "org_state"]

    fieldsets = organization_fieldset


@admin.register(RevenueProgram)
class RevenueProgramAdmin(admin.ModelAdmin):
    revenue_program_fieldset = (("RevenueProgram", {"fields": ("name", "slug", "organization")}),)

    readonly_fields = ["slug"]

    list_display = ["name", "slug"]

    list_filter = ["name"]

    fieldsets = revenue_program_fieldset


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    plan_fieldset = (("Plan", {"fields": ("name",)}),)

    list_display = ["name"]

    list_filter = ["name"]

    fieldsets = plan_fieldset


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    feature_fieldset = (("Feature", {"fields": ("name", "description", "plans")}),)

    list_display = ["name"]

    list_filter = ["name"]
