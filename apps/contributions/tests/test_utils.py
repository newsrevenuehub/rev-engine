import hashlib
import io
from csv import DictReader

from django.test import TestCase, override_settings

import pytest

from apps.contributions.models import Contribution
from apps.contributions.tests.factories import ContributionFactory
from apps.contributions.utils import (
    CONTRIBUTION_EXPORT_CSV_HEADERS,
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


@pytest.mark.django_db
def test_export_contributions_to_csv():
    contributions = []
    for _ in range(5):
        contributions.extend(
            [
                ContributionFactory(one_time=True),
                ContributionFactory(annual_subscription=True),
                ContributionFactory(monthly_subscription=True),
            ]
        )
    data = [row for row in DictReader(io.StringIO(export_contributions_to_csv(contributions)))]
    assert set(data[0].keys()) == set(CONTRIBUTION_EXPORT_CSV_HEADERS)
    assert set([str(_.pk) for _ in contributions]) == set([_["Contribution ID"] for _ in data])
    for row in data:
        contribution = Contribution.objects.get(pk=int(row["Contribution ID"]))
        assert contribution.billing_name and row[CONTRIBUTION_EXPORT_CSV_HEADERS[1]] == contribution.billing_name
        assert (
            contribution.formatted_amount and row[CONTRIBUTION_EXPORT_CSV_HEADERS[2]] == contribution.formatted_amount
        )
        assert (
            contribution.formatted_donor_selected_amount
            and row[CONTRIBUTION_EXPORT_CSV_HEADERS[3]] == contribution.formatted_donor_selected_amount
        )
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[4]] == str(
            (contribution.contribution_metadata or {}).get("agreed_to_pay_fees")
        )
        assert contribution.interval and row[CONTRIBUTION_EXPORT_CSV_HEADERS[5]] == contribution.interval
        assert contribution.created and row[CONTRIBUTION_EXPORT_CSV_HEADERS[6]] == str(contribution.created)
        assert contribution.status and row[CONTRIBUTION_EXPORT_CSV_HEADERS[7]] == contribution.status
        assert contribution.billing_address and row[CONTRIBUTION_EXPORT_CSV_HEADERS[8]] == contribution.billing_address
        assert contribution.billing_email and row[CONTRIBUTION_EXPORT_CSV_HEADERS[9]] == contribution.contributor.email
        assert contribution.billing_phone and row[CONTRIBUTION_EXPORT_CSV_HEADERS[10]] == contribution.billing_phone
        assert (
            row[CONTRIBUTION_EXPORT_CSV_HEADERS[11]]
            == (referer := (contribution.contribution_metadata or {}).get("referer", ""))
            and referer
        )
