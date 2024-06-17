from django.core.exceptions import ValidationError

from apps.config.models import DenyListWord


GENERIC_SLUG_DENIED_MSG = "This slug is not allowed"
SLUG_DENIED_CODE = "slug_disallowed"


def validate_slug_against_denylist(value):
    if DenyListWord.objects.filter(word=value).exists():
        raise ValidationError(GENERIC_SLUG_DENIED_MSG, code=SLUG_DENIED_CODE)
