from rest_framework import status
from rest_framework.exceptions import ValidationError


class UniquenessConstraintViolationViewSetMixin:
    def handle_exception(self, exc):
        """Ensure select uniqueness constraint errors receive a 409.

        For uniqueness constraints we want to return a 409 Conflict status code.
        On creation in particular, this will signal that a caller needs
        to update an existing record rather than create a new one.
        """
        if isinstance(exc, ValidationError):
            details = exc.detail
            if not isinstance(details, list):
                for errors in details.values():
                    if any(x.code == "unique" for x in errors):
                        exc.status_code = status.HTTP_409_CONFLICT
                        break
        return super().handle_exception(exc)
