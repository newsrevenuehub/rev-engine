import pytest
from rest_framework import serializers

from apps.users.validators import tax_id_validator


@pytest.mark.parametrize(
    ("value", "expect_valid"),
    [("123456789", True), (123456789, False), ("12345678", False), ("12-345678", False), (None, True)],
)
def test_tax_id_validator(value, expect_valid):
    if expect_valid:
        assert tax_id_validator(value) is None
    else:
        with pytest.raises(serializers.ValidationError):
            tax_id_validator(value)
