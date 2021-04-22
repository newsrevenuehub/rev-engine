from django.contrib import admin

from apps.organizations.models import Organization, RevenueProgram


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    class Meta:
        model = Organization


@admin.register(RevenueProgram)
class RevenueProgramAdmin(admin.ModelAdmin):
    class Meta:
        model = RevenueProgram
