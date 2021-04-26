from django.contrib import admin

from apps.organizations.models import Organization, RevenueProgram


admin.site.register(Organization)

admin.site.register(RevenueProgram)
