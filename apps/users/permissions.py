from rest_framework import permissions


class UserOwnsUser(permissions.BasePermission):
    """ """

    message = "You don't have permission to access this instance"

    def has_permission(self, request, view):
        """"""
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        """ """
        return obj == request.user


class UserEmailIsVerified(permissions.BasePermission):
    message = "You must verify your email address to access this resource"

    def has_permission(self, request, view):
        return request.user and request.user.email_verified
