"""Set error messages here, either for import or set them directly on field defaults."""

from rest_framework import serializers


GENERIC_BLANK = "This information is required"
serializers.CharField.default_error_messages["blank"] = GENERIC_BLANK

GENERIC_UNEXPECTED_VALUE = "Unexpected value"
GENERIC_NOT_FOUND = "Could not find instance by value"
