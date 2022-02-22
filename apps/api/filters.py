from django.conf import settings
from django.db.models import Q

from rest_framework import filters

from apps.common.utils import reduce_queryset_with_filters
from apps.users.models import Roles


ALL_ACCESSOR = "all"


class RoleAssignmentFilterBackend(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        """
        This is the mechanism by which lists of resources are filtered based on permissions.
        Here we must account for:
        - The user's role_assignment.role_type
        - The user's role_assignment's permitted organization and revenue programs
        - Optional org_slug and rp_slug query parameters
        """
        org_slug = request.GET.get(settings.ORG_SLUG_PARAM)
        rp_slug = request.GET.get(settings.RP_SLUG_PARAM)

        # Just for thoroughness, prevent AnonymousUser from viewing resources
        if not hasattr(request.user, "get_role_assignment"):
            return queryset.none()

        # Prevent users who have not been assigned a Role from viewing resources
        role_assignment = request.user.get_role_assignment()
        if not role_assignment:
            return queryset.none()

        user_role = role_assignment.role_type

        # If this isn't a ModelViewSet, we don't have anything to filter here.
        if not hasattr(view, "model"):
            return queryset

        model_name = view.model.__name__
        if model_name == "Organization":
            return self._get_organization_queryset(role_assignment, queryset)

        if model_name == "RevenueProgram":
            return self._get_revenue_program_queryset(role_assignment, org_slug, queryset)

        filters = []
        if hasattr(view.model, "organization") and type(view.model.organization) != property:
            # If the user is a hub_admin, we don't have a single org to restrict by
            if user_role != Roles.HUB_ADMIN:
                filters.append(Q(organization=role_assignment.organization))

            if org_slug and org_slug != ALL_ACCESSOR:
                filters.append(Q(organziation__slug=org_slug))

        if hasattr(view.model, "revenue_program") and type(view.model.revenue_program) != property:
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

    def _get_organization_queryset(self, role_assignment, queryset):
        """
        This is a request for Orgs. org_slug does not come in to play here, only
        the role_type.
        """
        if role_assignment.role_type != Roles.HUB_ADMIN:
            return queryset.filter(pk=role_assignment.organization.pk)
        return queryset

    def _get_revenue_program_queryset(self, role_assignment, org_slug, queryset):
        """
        Return queryset of RevenuePrograms that the user has permission to view AND that is filtered
        by org_slug
        """
        filters = []
        qs = queryset
        if role_assignment.role_type != Roles.HUB_ADMIN:
            qs = role_assignment.revenue_programs.all()

        if org_slug and org_slug != ALL_ACCESSOR:
            filters.append(Q(organization__slug=org_slug))

        return reduce_queryset_with_filters(qs, filters)
