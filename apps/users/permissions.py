from rest_framework import permissions


class UserOwnsUser(permissions.BasePermission):
    """Determine if user object for which request is made corresponds to requesting user"""

    message = "You don't have permission to access this instance"

    def has_permission(self, request, view):
        """"""
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        """ """
        return obj == request.user


def update_keys_dont_require_email_verification(request):
    allowed_update_keys = ["password"]
    return request.method == "PATCH" and set(request.data.keys()).issubset(set(allowed_update_keys))


def user_email_is_verified(request):
    return request.user and request.user.email_verified


class UserIsAllowedToUpdate(permissions.BasePermission):
    """Determine if update is permissible"""

    message = "You must verify this email address to update your user"

    def has_permission(self, request, view):
        return any(
            [
                update_keys_dont_require_email_verification(request),
                user_email_is_verified(request),
            ]
        )
