"""
Set error messages here, either for import or set them directly on field defaults.
"""
from rest_framework import serializers


GENERIC_BLANK = "This information is required"
serializers.CharField.default_error_messages["blank"] = GENERIC_BLANK


# Model-field specific
UNIQUE_PAGE_SLUG = "This slug has already been used"
