from django.views.generic import GenericViewError

import pytest
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.viewsets import ViewSet

from apps.api.mixins import UniquenessConstraintViolationViewSetMixin


class TestViewSet(UniquenessConstraintViolationViewSetMixin, ViewSet):
    pass


@pytest.mark.parametrize(
    ("validation_error_detail", "code", "expected_status_code"),
    [
        (
            {"field": [ValidationError("Not unique", code="unique")]},
            "unique",
            status.HTTP_409_CONFLICT,
        ),
        (
            {
                "field1": [ValidationError("Not unique", code="unique")],
                "field2": [ValidationError("Invalid", code="invalid")],
            },
            "invalid",
            status.HTTP_400_BAD_REQUEST,
        ),
        (
            {"field": [ValidationError("Invalid", code="invalid")]},
            "invalid",
            status.HTTP_400_BAD_REQUEST,
        ),
        (
            [ValidationError("Invalid")],
            None,
            status.HTTP_400_BAD_REQUEST,
        ),
    ],
)
def test_handle_exception(validation_error_detail, code, expected_status_code):
    viewset = TestViewSet()
    exc = ValidationError(detail=validation_error_detail, code=code)

    response = viewset.handle_exception(exc)

    assert exc.status_code == expected_status_code
    assert response.status_code == expected_status_code


def test_handle_exception_generic_error():
    viewset = TestViewSet()
    with pytest.raises(GenericViewError):
        viewset.handle_exception(GenericViewError())
