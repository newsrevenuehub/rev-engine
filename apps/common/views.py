from functools import wraps

from django.db.models import QuerySet
from django.http import JsonResponse
from django.middleware.csrf import CsrfViewMiddleware

from rest_framework import status


def csrf_protect_json(view_func):
    """Decorator that wraps a view function to enforce CSRF protection for AJAX requests.

    This has nearly identical logic as the `csrf_protect` decorator in Django, but returns a JSON response.

    It is meant to decorate API layer views that are expected to be called via AJAX, and will return a JSON response. In those cases,
    if we were to use the default `csrf_protect` decorator, the browser would receive a 403 response but with an HTML body, which is
    not what we want.

    This decorator allows us to continue to lean on Django's CSRF protection, but return a JSON response instead of an HTML response.

    """

    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        reason = CsrfViewMiddleware().process_view(request, None, (), {})
        # If there's a reason returned, it indicates a CSRF failure
        return (
            JsonResponse({"detail": "CSRF token missing or incorrect."}, status=status.HTTP_403_FORBIDDEN)
            if reason
            else view_func(request, *args, **kwargs)
        )

    return wrapped_view


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
