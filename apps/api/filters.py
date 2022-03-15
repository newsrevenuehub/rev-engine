from rest_framework import filters

from apps.api.permissions import filter_from_permissions


class RoleAssignmentFilterBackend(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        return filter_from_permissions(request, queryset, view.model)
