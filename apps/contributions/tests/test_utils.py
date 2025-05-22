import hashlib
import io
from csv import DictReader

import pytest

from apps.contributions.models import Contribution
from apps.contributions.tests.factories import ContributionFactory
from apps.contributions.utils import (
    CONTRIBUTION_EXPORT_CSV_HEADERS,
    export_contributions_to_csv,
    get_hub_stripe_api_key,
    get_sha256_hash,
)


class TestUtils:
    def test_get_hub_stripe_api_key_returns_live_key_when_proper_setting(self, settings):
        settings.STRIPE_LIVE_MODE = True
        settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS = "live-key"
        key = get_hub_stripe_api_key()
        assert key == settings.STRIPE_LIVE_SECRET_KEY_CONTRIBUTIONS

    def test_get_hub_stripe_api_key_returns_test_key_otherwise(self, settings):
        settings.STRIPE_LIVE_MODE = False
        settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS = "test-key"
        key = get_hub_stripe_api_key()
        assert key == settings.STRIPE_TEST_SECRET_KEY_CONTRIBUTIONS


def test_hash_is_salted(settings):
    settings.ENCRYPTION_SALT = "salt"
    result = hashlib.sha256(b"test")
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
    data = list(DictReader(io.StringIO(export_contributions_to_csv(contributions))))
    assert set(data[0].keys()) == set(CONTRIBUTION_EXPORT_CSV_HEADERS)
    assert {str(_.pk) for _ in contributions} == {_["Contribution ID"] for _ in data}
    for row in data:
        contribution = Contribution.objects.get(pk=int(row["Contribution ID"]))
        assert contribution.billing_name
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[1]] == contribution.billing_name
        assert contribution.formatted_amount
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[3]] == f"{contribution.amount / 100:.2f}"
        assert contribution.formatted_donor_selected_amount
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[4]] == f"{contribution.donor_selected_amount:.2f}"
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[5]] == str(
            (contribution.contribution_metadata or {}).get("agreed_to_pay_fees", "")
        )
        assert contribution.interval
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[6]] == contribution.interval
        assert contribution.created
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[7]] == str(contribution.created)
        assert contribution.status
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[8]] == contribution.status
        assert contribution.billing_address
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[9]] == contribution.billing_address
        assert contribution.billing_email
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[10]] == contribution.contributor.email
        assert contribution.billing_phone
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[11]] == contribution.billing_phone
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[12]] == (contribution.contribution_metadata or {}).get("referer", "")
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[13]] == (
            (contribution.contribution_metadata or {}).get("reason_for_giving", "") or ""
        )
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[14]] == (
            (contribution.contribution_metadata or {}).get("honoree", "") or ""
        )
        assert row[CONTRIBUTION_EXPORT_CSV_HEADERS[15]] == (
            (contribution.contribution_metadata or {}).get("in_memory_of", "") or ""
        )
