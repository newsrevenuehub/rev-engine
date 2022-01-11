from django.test import TestCase, override_settings

from apps.contributions.utils import get_hub_stripe_api_key


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
