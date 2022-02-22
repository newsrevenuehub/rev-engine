from django.conf import settings
from django.utils.module_loading import import_string

from rest_framework import permissions

from apps.contributions.models import Contributor


def append_permission_classes(classes=[]):
    default_permissions = [
        import_string(perm_classname) for perm_classname in settings.REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]
    ]
    return default_permissions + list(classes)


def reset_permission_classes(classes=[]):
    return list(classes)


class ReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, *args):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True


class IsContributor(permissions.BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.user, Contributor)


class ContributorOwnsContribution(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        """
        If request is coming from a contributor, verify that the requested contribution
        belongs to them.
        """
        if isinstance(request.user, Contributor):
            return obj.contributor.pk == request.user.pk
        return True


class HasRoleAssignment(permissions.BasePermission):
    def has_permission(self, request, view):
        """
        In general, a user must either be a Contributor or have a role_assignment to access anything from this API.
        """
        if isinstance(request.user, Contributor):
            return True

        return bool(request.user.get_role_assignment()) or request.user.is_superuser

    def has_object_permission(self, request, view, obj):
        """
        If the object has a relationship to Org, user must be assigned that org via role_assignment.
        If the object has a relationship to RevenueProgram, user must be assigned that rp via role_assignment.
        If the object has a relationship to both, user must be associated with both via role_assignment. This
        is an extra check for good measure. It should not be possible for an object to be associate with a
        RevenueProgram that does not belong to the Organization it is also associated with.
        """
        raise NotImplementedError("Need to do this!")
