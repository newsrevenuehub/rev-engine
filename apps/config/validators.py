from django.core.exceptions import ValidationError
from django.db.models.functions import Lower

from apps.config.models import DenyListWord


GENERIC_SLUG_DENIED_MSG = "This slug is not allowed"
SLUG_DENIED_CODE = "slug_disallowed"


def validate_slug_against_denylist(value):
    denylist_words = DenyListWord.objects.all().values_list(Lower("word"), flat=True)
    if value.lower() in denylist_words:
        raise ValidationError(GENERIC_SLUG_DENIED_MSG, code=SLUG_DENIED_CODE)
