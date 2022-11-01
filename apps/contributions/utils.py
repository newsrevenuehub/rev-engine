import hashlib
from datetime import datetime, timezone

from django.conf import settings


def get_hub_stripe_api_key(livemode=False):
    """
    Caller can force livemode with argument, otherwise use setting.
    """
    if livemode or settings.STRIPE_LIVE_MODE:
        return settings.STRIPE_LIVE_SECRET_KEY
    return settings.STRIPE_TEST_SECRET_KEY


def format_ambiguous_currency(integer):
    return f"{integer / 100:,.2f}"


def get_sha256_hash(string):
    """Return salted hash of string."""
    string = string + settings.ENCRYPTION_SALT  # add a salt
    result = hashlib.sha256(string.encode())
    hash_str = result.hexdigest()
    return hash_str[:15]


def convert_epoch_to_datetime(stripe_date):
    if isinstance(stripe_date, str) and not stripe_date.isnumeric():
        raise ValueError("Given date is not an Epoch.")
    return datetime.fromtimestamp(int(stripe_date), tz=timezone.utc)
