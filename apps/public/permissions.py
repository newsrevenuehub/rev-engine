from rest_framework import permissions


class IsSuperUser(permissions.BasePermission):
    def has_permission(self, request, *args):
        return getattr(request.user, "is_active", False) and request.user.is_superuser
