from django.db.models import QuerySet


class FilterForSuperUserOrRoleAssignmentUserMixin:
    """Provide a predictable API for filtering querysets to DRF viewset, mixin.

    Based on if user is a super user, has a role assignment, or is in some other state.
    """

    def filter_queryset_for_superuser_or_ra(self) -> QuerySet:
        if self.request.user.is_superuser:
            return self.model.objects.all()
        if ra := self.request.user.get_role_assignment():
            return self.model.objects.filter_by_role_assignment(ra)
        return self.model.objects.none()
