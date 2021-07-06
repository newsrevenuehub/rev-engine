from rest_framework import permissions

from apps.contributions.models import Contributor


class UserBelongsToOrg(permissions.BasePermission):
    """
    Object-level permission to only allow access to users associated with
    an Organization that owns the resrouce.
    """

    message = "User does not have permission to access this resource."

    def has_object_permission(self, request, view, obj):
        # This doesn't apply to Contributors
        if isinstance(request.user, Contributor):
            return True

        # Check if obj has an organization attached
        if not hasattr(obj, "organization"):
            return True

        return request.user.is_active and obj.organization.user_is_member(request.user)


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
