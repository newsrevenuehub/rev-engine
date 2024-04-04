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


test_valid_phone_numbers = [
    "+14155552671",
    "+1 415 555 2671",
    "+1 (415) 555-2671",
    "+1-415-555-2671",
    "+1.415.555.2671",
    "+14155552671",
    "+5548988883322",  # International number from Brazil
]

test_invalid_phone_numbers = [
    "123",
    "123-123-123",
    "123-123-123-123",
    "123-123-123-123-123",
    "123-123-123-123-123-123",
    "something",
]


@pytest.mark.parametrize("valid_number", test_valid_phone_numbers)
def test_valid_phone_numbers(valid_number):
    try:
        validate_contact_phone_number(valid_number)
    except ValidationError as er:
        assert False, f"{valid_number} raised an exception {er}"


@pytest.mark.parametrize("invalid_number", test_invalid_phone_numbers)
def test_invalid_phone_numbers(invalid_number):
    with pytest.raises(ValidationError):
        validate_contact_phone_number(invalid_number)
