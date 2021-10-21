import re

from django.core.exceptions import ValidationError


def validate_statement_descriptor_suffix(value):
    test_disallowed = re.search(r"[*\\\"<>']", value)
    test_at_least_one_char = re.search(r"[a-zA-Z]", value)
    if test_disallowed:
        raise ValidationError("Statement Descriptor Suffixes cannot contain [\",', <, >,\\, *]")

    if not test_at_least_one_char:
        raise ValidationError("There must be at least one letter in the descriptor.")
