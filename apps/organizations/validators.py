import re

from django.core.exceptions import ValidationError


def validate_statement_descriptor_suffix(value):
    test = re.search(r"[*\\\"<>']", value)
    if test:
        raise ValidationError("Statement Descriptor Suffixes cannot contain [\",', <, >,\\, *]")
