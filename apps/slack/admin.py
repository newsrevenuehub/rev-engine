from django.contrib import admin

from solo.admin import SingletonModelAdmin

from apps.slack.models import HubSlackIntegration, OrganizationSlackIntegration


admin.site.register(HubSlackIntegration, SingletonModelAdmin)
admin.site.register(OrganizationSlackIntegration)
