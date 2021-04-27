from django.contrib import admin

from apps.organizations.models import Feature, Organization, Plan, RevenueProgram


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

    readonly_fields = ["name", "slug"]

    list_display = ["name", "slug", "plan", "org_state"]

    list_filter = ["name", "plan", "org_state"]

    def get_readonly_fields(self, request, obj=None):
        if not obj:
            return ["slug"]
        return super().get_readonly_fields(request, obj)


@admin.register(RevenueProgram)
class RevenueProgramAdmin(admin.ModelAdmin):
    fieldsets = (("RevenueProgram", {"fields": ("name", "slug", "organization")}),)

    readonly_fields = ["slug"]

    list_display = ["name", "slug"]

    list_filter = ["name"]

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return ["name", "slug", "organization"]
        return super().get_readonly_fields(request, obj)


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