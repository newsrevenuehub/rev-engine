import hashlib

from django.test import TestCase, override_settings

from addict import Dict as AttrDict

from apps.contributions.utils import (
    export_contributions_to_csv,
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


def test_export_contributions_to_csv():
    address_1 = {
        "city": "Austin",
        "line1": "800 Long Bow Ln",
        "line2": None,
        "state": "TX",
        "country": "US",
        "postal_code": "78701",
    }
    metadata_1 = {"donor_selected_amount": "450", "agreed_to_pay_fees": "True", "referer": "referer_1"}
    billing_details_1 = {
        "name": "Test Name 1",
        "email": "test_name_1@test.com",
        "phone": "9999999999",
        "address": address_1,
    }
    payment_provider_data_1 = {
        "data": {"object": {"charges": {"data": [{"billing_details": billing_details_1, "metadata": metadata_1}]}}}
    }

    address_2 = {"city": None, "line1": None, "line2": None, "state": None, "country": None, "postal_code": None}
    metadata_2 = {"donor_selected_amount": "1450", "agreed_to_pay_fees": "False", "referer": "referer_2"}
    billing_details_2 = {
        "name": "Test Name 2",
        "email": "test_name_2@test.com",
        "phone": "8888888888",
        "address": address_2,
    }
    payment_provider_data_2 = {
        "data": {"object": {"charges": {"data": [{"billing_details": billing_details_2, "metadata": metadata_2}]}}}
    }

    contribution_1 = AttrDict(
        {"formatted_amount": "500.0 USD", "currency": "usd", "payment_provider_data": payment_provider_data_1}
    )
    contribution_2 = AttrDict(
        {"formatted_amount": "1500.0 USD", "currency": "usd", "payment_provider_data": payment_provider_data_2}
    )

    data = export_contributions_to_csv([contribution_1, contribution_2])
    expected = "\r\n".join(
        [
            '"Contributor","Amount","Donor Selected Amount","Agreed to Pay Fees","Frequency","Payment Received Date","Payment status","Address","Email","Phone","Page URL"',
            '"Test Name 1","500.0 USD","","","{}","{}","{}","800 Long Bow Ln, Austin, 78701, TX, US","test_name_1@test.com","9999999999",""',
            '"Test Name 2","1500.0 USD","","","{}","{}","{}","","test_name_2@test.com","8888888888",""',
            "",
        ]
    )

    assert data == expected
