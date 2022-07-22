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


class UserEmailIsVerified(permissions.BasePermission):
    """Determine if user has verified their email address"""

    message = "You must verify your email address to access this resource"

    def has_permission(self, request, view):
        return request.user and request.user.email_verified
