import hashlib

from django.test import TestCase, override_settings

from addict import Dict as AttrDict

from apps.contributions.models import ContributionInterval
from apps.contributions.utils import (
    get_hub_stripe_api_key,
    get_sha256_hash,
    payment_interval_from_stripe_invoice,
)


LIVE_KEY = "live-key-test"
TEST_KEY = "test-key"


@override_settings(STRIPE_LIVE_SECRET_KEY=LIVE_KEY)
@override_settings(STRIPE_TEST_SECRET_KEY=TEST_KEY)
class UtilsTest(TestCase):
    @override_settings(STRIPE_LIVE_MODE=True)
    def test_get_hub_stripe_api_key_returns_live_key_when_proper_setting(self):
        key = get_hub_stripe_api_key()
        self.assertEqual(key, LIVE_KEY)

    @override_settings(STRIPE_LIVE_MODE=False)
    def test_get_hub_stripe_api_key_returns_test_key_otherwise(self):
        key = get_hub_stripe_api_key()
        self.assertEqual(key, TEST_KEY)


@override_settings(ENCRYPTION_SALT="salt")
def test_hash_is_salted():
    result = hashlib.sha256("test".encode())
    hash_str = result.hexdigest()
    assert hash_str[:15] != get_sha256_hash("test")  # because salt is added


def test_payment_interval_from_stripe_invoice():
    assert payment_interval_from_stripe_invoice(None, ContributionInterval) is None

    # when lines attribute is None for an invoice
    no_line_items = AttrDict({"lines": None})
    assert payment_interval_from_stripe_invoice(no_line_items, ContributionInterval) is None

    # when the data is empty in line items of invoice
    empty_data_in_line_items = AttrDict({"lines": {"data": []}})
    assert payment_interval_from_stripe_invoice(empty_data_in_line_items, ContributionInterval) is None

    # monthly invoice
    monthly_invoice = AttrDict({"lines": {"data": [{"plan": {"interval": "month", "interval_count": 1}}]}})
    assert payment_interval_from_stripe_invoice(monthly_invoice, ContributionInterval) == ContributionInterval.MONTHLY

    # yearly invoice
    yearly_invoice = AttrDict({"lines": {"data": [{"plan": {"interval": "year", "interval_count": 1}}]}})
    assert payment_interval_from_stripe_invoice(yearly_invoice, ContributionInterval) == ContributionInterval.YEARLY
