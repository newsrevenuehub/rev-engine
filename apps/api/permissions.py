from rest_framework import permissions

from apps.contributions.models import Contributor


ALL_ACCESSOR = "all"


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
        return all([is_a_contributor(request.user), obj.contributor.pk == request.user.pk])


class HasRoleAssignment(permissions.BasePermission):
    def has_permission(self, request, view):
        """
        Determine if the request user has a role assignment. Contributors will not.
        """
        # if request url contains refs to role assignment related objects ....
        return getattr(request.user, "get_role_assignment", False) and bool(request.user.get_role_assignment())


def is_a_contributor(user):
    return isinstance(user, Contributor)
