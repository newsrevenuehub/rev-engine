from rest_framework import permissions

from apps.api.permissions import IsContributor
from apps.public.permissions import IsActiveSuperUser


class IsContributorOrSuperuser(permissions.BasePermission):
    """Determine if user is a contributor or superuser."""

    def has_permission(self, request, view):
        # Define the individual permission checks
        return IsContributor().has_permission(request, view) or IsActiveSuperUser().has_permission(request, view)
