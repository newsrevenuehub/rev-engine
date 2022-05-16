from rest_framework import permissions


class IsActiveSuperUser(permissions.BasePermission):
    """User has permission if they are active and a superuser"""

    def has_permission(self, request, *args):
        return all(
            [
                getattr(request.user, "is_active", False) is True,
                getattr(request.user, "is_superuser", False) is True,
            ]
        )
