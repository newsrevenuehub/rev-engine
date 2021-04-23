from django.contrib import admin

from apps.organizations.models import Organization, RevenueProgram
from apps.users.admin import UserOrganizationInline


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    inlines = [
        UserOrganizationInline,
    ]

    class Meta:
        model = Organization


@admin.register(RevenueProgram)
class RevenueProgramAdmin(admin.ModelAdmin):
    class Meta:
        model = RevenueProgram
