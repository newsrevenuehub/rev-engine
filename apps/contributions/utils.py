import hashlib

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
    string = string + settings.UID_SALT  # add a salt
    result = hashlib.sha256(string.encode())
    hash_str = result.hexdigest()
    return hash_str[:15]
