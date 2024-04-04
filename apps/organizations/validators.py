import re

from django.core.exceptions import ValidationError

import phonenumbers


def validate_statement_descriptor_suffix(value):
    test_disallowed = re.search(r"[*\\\"<>']", value)
    test_at_least_one_char = re.search(r"[a-zA-Z]", value)
    if test_disallowed:
        raise ValidationError("Statement Descriptor Suffixes cannot contain [\",', <, >,\\, *]")

    if not test_at_least_one_char:
        raise ValidationError("There must be at least one letter in the descriptor.")


def validate_contact_phone_number(value):
    try:
        phone_number = phonenumbers.parse(value)
        if not phonenumbers.is_valid_number(phone_number):
            raise ValidationError(f"Invalid phone number: {value}")
    except phonenumbers.phonenumberutil.NumberParseException:
        raise ValidationError(f"Phone not parsable: {value}")
