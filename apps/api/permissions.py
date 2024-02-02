import logging

from django.conf import settings

from rest_framework import permissions
from waffle import get_waffle_flag_model

from apps.common.constants import (
    CONTRIBUTIONS_API_ENDPOINT_ACCESS_FLAG_NAME,
    MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME,
)
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


class IsOrgAdmin(permissions.BasePermission):
    """Org Admin permission

    If the user making the request is an org admin, grant permission.
    """

    def has_permission(self, request, view):
        return all(
            [
                role_assignment := getattr(request.user, "roleassignment", False),
                role_assignment.role_type == Roles.ORG_ADMIN,
            ]
        )


class IsRpAdmin(permissions.BasePermission):
    """RP Admin permission

    If the user making the request is a RP admin, grant permission.
    """

    def has_permission(self, request, view):
        return all(
            [
                role_assignment := getattr(request.user, "roleassignment", False),
                role_assignment.role_type == Roles.RP_ADMIN,
            ]
        )


class IsGetRequest(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method == "GET"


class IsPatchRequest(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method == "PATCH"


class UserIsRequestedContributor(permissions.BasePermission):
    """Determine if the requesting user is the same contributor as the object in question"""

    def has_object_permission(self, request, view, obj):
        return obj == request.user if isinstance(obj, Contributor) else False


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
        ra = getattr(request.user, "get_role_assignment", lambda: None)()
        return bool(ra) and ra.role_type in [Roles.HUB_ADMIN, Roles.ORG_ADMIN, Roles.RP_ADMIN]


def is_a_contributor(user):
    return isinstance(user, Contributor)


class BaseFlaggedResourceAccess(permissions.BasePermission):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.flag = None

    def has_permission(self, request, view):
        """Has permission if flag is active for user

        NB: We need to do `self.flag.is_active_for_user` and also self.flag.everyone
        because django-waffle's `is_active_for_user` doesn't reference .everyone in its
        criteria. This is a known issue with Django Waffle
        (https://github.com/django-waffle/django-waffle/issues/401).
        """
        return self.flag.is_active_for_user(request.user) or self.flag.everyone

    def __str__(self):
        return f"`{self.__class__.__name__}` via {self.flag.name if self.flag else '<not configured>'}"


class HasFlaggedAccessToMailchimp(BaseFlaggedResourceAccess):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        Flag = get_waffle_flag_model()
        self.flag = Flag.objects.filter(name=MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME).first()
        if not self.flag:
            raise ApiConfigurationError()


class HasFlaggedAccessToContributionsApiResource(BaseFlaggedResourceAccess):
    """Use named flag to determine access to contributions api resource...

    ...insofar as this permission is applied to the contributions endpoint as intended
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        Flag = get_waffle_flag_model()
        self.flag = Flag.objects.filter(name=CONTRIBUTIONS_API_ENDPOINT_ACCESS_FLAG_NAME).first()
        if not self.flag:
            raise ApiConfigurationError()


class DoubleSubmitCsrfPermission(permissions.BasePermission):
    """
    Permission to ensure that CSRF token in request headers is same as one in cookies.

    Note that this permission alone does not ensure that the CSRF tokens themselves are valid
    only that they match. That logic is assumed to have happened elsewhere in the request pipeline.
    """

    def has_permission(self, request, view):
        csrf_cookie_token = request.COOKIES.get(settings.CSRF_COOKIE_NAME)
        csrf_header_token = request.headers.get("X-CSRFToken", None)
        return all([csrf_cookie_token, csrf_header_token, csrf_cookie_token == csrf_header_token])


IsAuthenticatedWithDoubleSubmitCsrf = permissions.IsAuthenticated & DoubleSubmitCsrfPermission
