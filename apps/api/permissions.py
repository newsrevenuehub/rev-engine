from django.conf import settings
from django.db.models import Q

from rest_framework import permissions

from apps.common.utils import reduce_queryset_with_filters
from apps.contributions.models import Contributor
from apps.users.models import Roles


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
        return all([isinstance(request.user, Contributor), obj.contributor.pk == request.user.pk])


class RoleUnexpectedModelType(Exception):
    pass


class HasRoleAssignment(permissions.BasePermission):
    def has_permission(self, request, view):
        """
        Determine if the request user has a role assignment. Contributors will not.
        """
        return getattr(request.user, "get_role_assignment", False) and bool(request.user.get_role_assignment())

    def has_object_permission(self, request, view, obj):
        """
        A slightly odd pattern here where we take an instance of a model and turn it in to a queryset of itself.
        This is so that we can reuse `filter_from_permissions` both here and in the filter_queryset method of a FilterBackend.
        In this case, we treat queryset.none() as not granting permission for the object.
        """
        obj_qs = obj.__class__.objects.filter(pk=obj.pk)
        filtered_qs = filter_from_permissions(request, obj_qs, obj.__class__)
        return filtered_qs.exists()


def _handle_contributor_user(request, queryset, model):
    """NB: for contributor users we don't apply any filtering within the calling

    context for this function. At the time of this comment, the contributor's queryset is
    filtered in apps/contributions/views.py::ContributionsViewSet.get_queryset
    """
    return queryset


def _handle_superuser_user(request, queryset, model):
    return queryset


def _is_contributor(user):
    return isinstance(user, Contributor)


def _model_relates_via_organization(model):
    return hasattr(model, "organization") and type(model.organization) != property


def _reduce_organization_queryset_with_filters(user_role, is_superuser, organization, org_slug, queryset):
    filters = []
    # If the user is a hub_admin, we don't have a single org to restrict by
    if user_role != Roles.HUB_ADMIN and not is_superuser:
        filters.append(Q(organization=organization))
    if org_slug and org_slug != ALL_ACCESSOR:
        filters.append(Q(organization__slug=org_slug))
    return reduce_queryset_with_filters(queryset, filters)


def _model_relates_via_revenue_program(model):
    return hasattr(model, "revenue_program") and type(model.revenue_program) != property


def _reduce_revenue_program_queryset_with_filters(user_role, role_assignment, org_slug, rp_slug, queryset):
    filters = []
    if user_role == Roles.ORG_ADMIN:
        filters.append(Q(revenue_program__in=role_assignment.organization.revenueprogram_set.all()))

    if user_role == Roles.RP_ADMIN:
        filters.append(Q(revenue_program__in=role_assignment.revenue_programs.all()))

    if org_slug and org_slug != ALL_ACCESSOR:
        # We still need to filter on org_slug, even if there is not a direct relationship to Org.
        # We do so by ensuring that the provided org slug is for an org that owns this resource's
        # Revenue Program
        filters.append(Q(revenue_program__organization__slug=org_slug))
    if rp_slug and rp_slug != ALL_ACCESSOR:
        filters.append(Q(revenue_program__slug=rp_slug))
    return reduce_queryset_with_filters(queryset, filters)


def filter_from_permissions(request, queryset, model):
    """
    This is the mechanism by which lists of resources are filtered based on permissions.
    Here we must account for:
    - The user's role_assignment.role_type
    - The user's role_assignment's permitted organization and revenue programs
    - Optional org_slug and rp_slug query parameters

    add notes about the assumptions about how has_permission has been applied upstream

    # Prevent users who have not been assigned a Role from viewing resources

    """
    org_slug = request.GET.get(settings.ORG_SLUG_PARAM)
    rp_slug = request.GET.get(settings.RP_SLUG_PARAM)

    # If it's a contributor, pass through. The assumption is that Contributors have results
    # filtered by the object permissions logic in `ContributorOwnsContribution``
    if _is_contributor(request.user):
        return _handle_contributor_user(request, queryset, model)

    if request.user.is_superuser:
        return _handle_superuser_user(request, queryset, model)

    role_assignment = request.user.get_role_assignment()
    user_role = role_assignment.role_type

    model_name = model.__name__

    # Now based on the type of modeling we're dealing with
    if model_name == "Organization":
        return _get_organization_queryset(role_assignment, queryset)
    if model_name == "RevenueProgram":
        return _get_revenue_program_queryset(role_assignment, org_slug, queryset)
    if model_name == "Contribution":
        return _get_contributions_queryset(role_assignment, queryset, org_slug, rp_slug)

    if _model_relates_via_organization(model):
        return _reduce_organization_queryset_with_filters(
            user_role, request.user.is_superuser, role_assignment.organization, org_slug, queryset
        )
    if _model_relates_via_revenue_program(model):
        return _reduce_revenue_program_queryset_with_filters(
            user_role,
            role_assignment,
            org_slug,
            rp_slug,
            queryset,
        )
    else:
        raise RoleUnexpectedModelType(
            f"Only `Organization`, `RevenueProgram` or models with a relationship to these "
            f'can be used in `filter_from_permissions`. You provided "{model_name}"'
        )


def _get_organization_queryset(role_assignment, queryset):
    """
    This is a request for Orgs. org_slug does not come in to play here, only
    the role_type.
    """
    if role_assignment and role_assignment.role_type != Roles.HUB_ADMIN:
        return queryset.filter(pk=role_assignment.organization.pk)
    return queryset


def _get_revenue_program_queryset(role_assignment, org_slug, queryset):
    """
    Return queryset of RevenuePrograms that the user has permission to view AND that is filtered
    by org_slug
    """
    filters = []
    if role_assignment and role_assignment.role_type != Roles.HUB_ADMIN:
        queryset = role_assignment.revenue_programs.all()

    if org_slug and org_slug != ALL_ACCESSOR:
        filters.append(Q(organization__slug=org_slug))

    return reduce_queryset_with_filters(queryset, filters)


def _get_contributions_queryset(role_assignment, queryset, org_slug, rp_slugs):
    """ """
    filters = []
    if role_assignment.role_type == Roles.ORG_ADMIN:
        queryset = queryset.filter(organization=role_assignment.organization)
    if role_assignment.role_type == Roles.RP_ADMIN:
        queryset = queryset.filter(
            donation_page__revenue_program__pk__in=[item.id for item in role_assignment.revenue_programs.all()]
        )
    if org_slug and org_slug != ALL_ACCESSOR:
        filters.append(Q(organization__slug=org_slug))
    if rp_slugs:
        filters.append(Q(donation_page__revenue_program__slug__in=rp_slugs))
    return reduce_queryset_with_filters(queryset, filters)
