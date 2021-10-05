from django.core.exceptions import ValidationError

import pytest

from apps.organizations.validators import validate_statement_descriptor_suffix


test_strings = [r"Fun*", r'except"ion', r"<golf>", r"golf>", r"<golf", r"go<lf", r"bad'wolf", r"bad\wolf", r"\dominus"]


@pytest.mark.parametrize("string", test_strings)
def test_bad_characters(string):
    with pytest.raises(ValidationError):
        validate_statement_descriptor_suffix(string)


def test_good_characters():
    good_string = r"THISIS#FINE"
    try:
        validate_statement_descriptor_suffix(good_string)
    except ValidationError as er:
        assert False, f"{good_string} raised an exception"
