import hashlib
from datetime import datetime, timezone

from django.test import TestCase, override_settings

import pytest

from apps.contributions.utils import (
    convert_epoch_to_datetime,
    get_hub_stripe_api_key,
    get_sha256_hash,
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


def test_convert_epoch_to_datetime():
    with pytest.raises(ValueError):
        convert_epoch_to_datetime("166729694a")

    expected_datetime = datetime(year=2022, month=11, day=1, hour=10, minute=2, second=24, tzinfo=timezone.utc)
    assert convert_epoch_to_datetime("1667296944") == expected_datetime
    assert convert_epoch_to_datetime(1667296944) == expected_datetime
