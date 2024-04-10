from django.core.exceptions import ValidationError

import pytest

from apps.organizations.validators import (
    validate_contact_phone_number,
    validate_statement_descriptor_suffix,
)


test_bad_strings = [
    r"Fun*",
    r'except"ion',
    r"<golf>",
    r"golf>",
    r"<golf",
    r"go<lf",
    r"bad'wolf",
    r"bad\wolf",
    r"\dominus",
    r"12323873",
]

test_good_strings = [
    r"THISIS#FINE",
    r"122373b",
    r"123b345",
    r"b123434",
]


@pytest.mark.parametrize("bad_string", test_bad_strings)
def test_bad_characters(bad_string):
    with pytest.raises(ValidationError):
        validate_statement_descriptor_suffix(bad_string)


@pytest.mark.parametrize("good_string", test_good_strings)
def test_good_characters(good_string):
    try:
        validate_statement_descriptor_suffix(good_string)
    except ValidationError as er:
        assert False, f"{good_string} raised an exception {er}"


@pytest.fixture(
    params=[
        "+14155552671",
        "+1 415 555 2671",
        "+1 (415) 555-2671",
        "+1-415-555-2671",
        "+1.415.555.2671",
        "+14155552671",
        "+5548988883322",  # International number from Brazil
    ]
)
def valid_phone_number(request):
    return request.param


@pytest.fixture(
    params=[
        # Non parsable phone numbers
        "123",
        "123-123-123",
        "123-123-123-123",
        "123-123-123-123-123",
        "123-123-123-123-123-123",
        "something",
        # Parsable, but invalid phone number from Brazil
        "+5548000000000",
    ]
)
def invalid_phone_number(request):
    return request.param


def test_valid_phone_numbers(valid_phone_number):
    validate_contact_phone_number(valid_phone_number)


def test_invalid_phone_numbers(invalid_phone_number):
    with pytest.raises(ValidationError):
        validate_contact_phone_number(invalid_phone_number)
