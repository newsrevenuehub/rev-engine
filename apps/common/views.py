from django.db.models import QuerySet


class FilterForSuperUserOrRoleAssignmentUserMixin:
    """This mixin is meant to be used in a DRF viewset to provide a predictable API for filtering querysets

    based on if user is a super user, has a role assignment, or is in some other state.
    """

    def filter_queryset_for_superuser_or_ra(self) -> QuerySet:
        if self.request.user.is_superuser:
            return self.model.objects.all()
        elif ra := self.request.user.get_role_assignment():
            return self.model.objects.filtered_by_role_assignment(ra)
        else:
            return self.model.objects.none()
