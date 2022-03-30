from django.conf import settings

from rest_framework import permissions

from apps.contributions.models import Contributor
from apps.users.choices import Roles


ALL_ACCESSOR = "all"


class IsContributor(permissions.BasePermission):
    """Contributor permission

    If the user making the request is a contributor, grant permission. Object-level
    permissions for contributors are handled elsewhwere
    """

    def has_permission(self, request, view):
        return isinstance(request.user, Contributor)


class IsHubAdmin(permissions.BasePermission):
    """Hub admin permission

    This is only used for gating access to the resource altogether. Object-level
    permissions are not handled here.
    """

    def has_permission(self, request, view):
        return all(
            [
                role_assignment := getattr(request.user, "roleassignment", False),
                role_assignment.role_type == Roles.HUB_ADMIN,
            ]
        )


class ContributorOwnsContribution(permissions.BasePermission):
    """Handle object-level permissions for contributors vis-a-vis contributions"""

    def has_object_permission(self, request, view, obj):
        """
        If request is coming from a contributor, verify that the requested contribution
        belongs to them.
        """
        return all([is_a_contributor(request.user), obj.contributor.pk == request.user.pk])


IsContributorOwningContribution = IsContributor & ContributorOwnsContribution


class HasRoleAssignment(permissions.BasePermission):
    """
    Determine if the request user has a role assignment. Contributors will not.
    """

    def has_permission(self, request, view):
        return getattr(request.user, "get_role_assignment", False) and bool(request.user.get_role_assignment())


class HasCreatePrivilegesForSlugs(permissions.BasePermission):
    """Determine user has create permission for a given combo of organization
    and revenue program slugs.

    Note that this permission assumes that the view is using the FilterQuerySetByUserMixin
    and that the model is using RoleAssignmentResourceModelMixin (implementing
    `user_has_create_permission_by_virtue_of_role` in the model).
    """

    def has_permission(self, request, view):
        org_slug = request.query_params.get(settings.ORG_SLUG_PARAM)
        rp_slug = request.query_params.get(settings.RP_SLUG_PARAM)
        return view.model.user_has_create_permission_by_virtue_of_role(
            request.user,
            org_slug,
            rp_slug,
        )


class HasDeletePrivilegesViaRole(permissions.BasePermission):
    """Determine if the user has delete permission for a given combo of organization
    and revenue program slugs.

    Note that this permission assumes that the view is using the FilterQuerySetByUserMixin
    and that the model is using RoleAssignmentResourceModelMixin (implementing
    `user_has_create_permission_by_virtue_of_role` in the model).
    """

    def has_permission(self, request, view):
        pk = view.kwargs.get("pk")
        instance = view.model.objects.get(pk=pk)
        return pk is not None and view.model.user_has_delete_permission_by_virtue_of_role(request.user, instance)


def is_a_contributor(user):
    return isinstance(user, Contributor)
