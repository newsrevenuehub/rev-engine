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


def payment_interval_from_stripe_invoice(invoice, contribution_interval_model):
    invoice_line_item = {}
    if invoice:
        invoice_line_item = (invoice.lines.data or [{}])[0]

    interval = invoice_line_item.get("plan", {}).get("interval")
    interval_count = invoice_line_item.get("plan", {}).get("interval_count")

    if interval == "year" and interval_count == 1:
        return contribution_interval_model.YEARLY
    if interval == "month" and interval_count == 1:
        return contribution_interval_model.MONTHLY

    return None


def convert_stripe_date_to_datetime(stripe_date):
    return datetime.fromtimestamp(int(stripe_date), tz=timezone.utc)
