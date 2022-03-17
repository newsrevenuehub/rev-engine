from rest_framework import permissions


class IsSuperUser(permissions.BasePermission):
    def has_permission(self, request, *args):
        return hasattr(request.user, "is_active") and request.user.is_active and request.user.is_superuser
