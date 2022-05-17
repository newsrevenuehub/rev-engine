import logging

from django.conf import settings

from rest_framework import permissions
from waffle import get_waffle_flag_model

from apps.contributions.models import Contributor
from apps.users.choices import Roles

from .exceptions import ApiConfigurationError


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


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


class _BaseAssumedViewAndModelMixin:
    """Ensure view and model use mixins as expected by HasCreatePrivielgesViaRole and HasDeletePrivilegesViaRole"""

    def __init__(self, view, *args, **kwargs):
        if not self._assumed_mixins_configured(view):
            raise ApiConfigurationError()
        return super().__init__(*args, **kwargs)

    def __call__(self):
        # https://stackoverflow.com/a/67154035
        return self

    def _assumed_mixins_configured(self, view):
        # vs circular imports
        from apps.users.models import RoleAssignmentResourceModelMixin
        from apps.users.views import FilterQuerySetByUserMixin

        return all(
            [isinstance(view, FilterQuerySetByUserMixin), issubclass(view.model, RoleAssignmentResourceModelMixin)]
        )


class HasCreatePrivilegesViaRole(_BaseAssumedViewAndModelMixin):
    """Call a view's model's `user_has_create_permission_by_virtue_of_role` method to determine permissions"""

    def has_permission(self, request, view):
        return view.model.user_has_create_permission_by_virtue_of_role(request.user, view)


class HasDeletePrivilegesViaRole(_BaseAssumedViewAndModelMixin):
    """Call a view's model's `user_has_delete_permission_by_virtue_of_role` method to determine permissions"""

    def has_permission(self, request, view):
        pk = view.kwargs.get("pk")
        try:
            instance = view.model.objects.get(pk=pk)
            return pk is not None and view.model.user_has_delete_permission_by_virtue_of_role(request.user, instance)
        except view.model.DoesNotExist:
            logger.warning(
                f"`HasDeletePrivilegesViaRole.has_permission` cannot find the requested instance with pk {pk}"
            )
            return False


def is_a_contributor(user):
    return isinstance(user, Contributor)


def create_flagged_access_permission(flag_name):
    """Used to dynamically generate a permission related to flag with `flag_name`

    This is necessary because it's not straightforward to pass the `flag_name` param
    to `HasFlaggedAccess` when referencing in a view's `permission_classes` (i.e., you can't
    do `permission_classes = (HasFlaggedAccess("some_flag_name"),)` )
    """

    class HasFlaggedAccess(permissions.BasePermission):
        """Determine permission based on a named Flag"""

        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            Flag = get_waffle_flag_model()
            self.flag = Flag.objects.filter(name=flag_name).first()

        def __str__(self):
            return f"`HasFlaggedAccess` via {self.flag_name}"

        def has_permission(self, request, view):
            """Has permission if flag is active for user"""
            if not self.flag:
                return False
            return self.flag.is_active_for_user(request.user)

    return HasFlaggedAccess
