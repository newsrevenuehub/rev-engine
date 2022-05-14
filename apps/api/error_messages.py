"""
Set error messages here, either for import or set them directly on field defaults.
"""
from rest_framework import serializers


GENERIC_BLANK = "This information is required"
serializers.CharField.default_error_messages["blank"] = GENERIC_BLANK

GENERIC_NOT_FOUND = "Could not find instance by value"

# Model-field specific
UNIQUE_PAGE_SLUG = "This slug is already in use on this Revenue Program"
