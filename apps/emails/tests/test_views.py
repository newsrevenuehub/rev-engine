import pytest
from rest_framework.test import APIRequestFactory

from apps.organizations.tests.factories import RevenueProgramFactory

from ..views import (
    preview_contribution_confirmation,
    preview_recurring_contribution_canceled,
    preview_recurring_contribution_payment_updated,
    preview_recurring_contribution_reminder,
)


# These are basic smoke tests of the methods. Testing that content is correct
# happens in tests of methods that use these templates with real data.


@pytest.mark.django_db()
class TestContributionConfirmation:
    def test_responds_200(self):
        rp = RevenueProgramFactory()
        assert preview_contribution_confirmation(APIRequestFactory().get(f"/?rp={rp.id}")).status_code == 200

    def test_logo_override_responds_200(self):
        rp = RevenueProgramFactory()
        assert preview_contribution_confirmation(APIRequestFactory().get(f"/?rp={rp.id}&logo=test")).status_code == 200


@pytest.mark.django_db()
class TestRecurringContributionReminder:
    def test_responds_200(self):
        rp = RevenueProgramFactory()
        assert preview_recurring_contribution_reminder(APIRequestFactory().get(f"/?rp={rp.id}")).status_code == 200

    def test_logo_override_responds_200(self):
        rp = RevenueProgramFactory()
        assert (
            preview_recurring_contribution_reminder(APIRequestFactory().get(f"/?rp={rp.id}&logo=test")).status_code
            == 200
        )


@pytest.mark.django_db()
class TestRecurringContributionCanceled:
    def test_responds_200(self):
        rp = RevenueProgramFactory()
        assert preview_recurring_contribution_canceled(APIRequestFactory().get(f"/?rp={rp.id}")).status_code == 200

    def test_logo_override_responds_200(self):
        rp = RevenueProgramFactory()
        assert (
            preview_recurring_contribution_canceled(APIRequestFactory().get(f"/?rp={rp.id}&logo=test")).status_code
            == 200
        )

    def test_text_sends_plaintext(self):
        rp = RevenueProgramFactory()
        assert (
            preview_recurring_contribution_canceled(APIRequestFactory().get(f"/?rp={rp.id}&text=y")).headers[
                "Content-Type"
            ]
            == "text/plain"
        )


@pytest.mark.django_db()
class TestRecurringContributionPaymentUpdated:
    def test_responds_200(self):
        rp = RevenueProgramFactory()
        assert (
            preview_recurring_contribution_payment_updated(APIRequestFactory().get(f"/?rp={rp.id}")).status_code == 200
        )

    def test_logo_override_responds_200(self):
        rp = RevenueProgramFactory()
        assert (
            preview_recurring_contribution_payment_updated(
                APIRequestFactory().get(f"/?rp={rp.id}&logo=test")
            ).status_code
            == 200
        )

    def test_text_sends_plaintext(self):
        rp = RevenueProgramFactory()
        assert (
            preview_recurring_contribution_payment_updated(APIRequestFactory().get(f"/?rp={rp.id}&text=y")).headers[
                "Content-Type"
            ]
            == "text/plain"
        )
