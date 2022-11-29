from unittest.mock import Mock

from django.utils import timezone

import pytest
from addict import Dict as AttrDict
from stripe.error import StripeError

from apps.contributions.models import Contribution, ContributionInterval
from apps.contributions.tests.factories import ContributionFactory
from apps.emails.tasks import send_thank_you_email


@pytest.mark.django_db
class TestSendThankYouEmail:
    @pytest.mark.parametrize("interval", (ContributionInterval.ONE_TIME, ContributionInterval.MONTHLY))
    def test_happy_path(self, monkeypatch, interval):
        contribution = ContributionFactory(provider_customer_id="something", interval=interval)
        now = timezone.now()
        mock_send_email = Mock()
        monkeypatch.setattr("apps.emails.tasks.send_templated_email", mock_send_email)
        customer = AttrDict({"name": "Foo Bar"})
        mock_customer_retrieve = Mock()
        mock_customer_retrieve.return_value = customer
        monkeypatch.setattr("stripe.Customer.retrieve", mock_customer_retrieve)
        magic_link = "something"
        mock_create_magic_link = Mock()
        mock_create_magic_link.return_value = magic_link
        monkeypatch.setattr("apps.contributions.models.Contributor.create_magic_link", mock_create_magic_link)
        send_thank_you_email(contribution.id, now.date(), now.year)
        assert mock_send_email.called_once_with(
            contribution.contributor.email,
            "Thank you for your contribution!",
            "nrh-default-contribution-confirmation-email.txt",
            "nrh-default-contribution-confirmation-email.html",
            {
                "contribution_date": now.date().strftime("%m-%d-%y"),
                "contributor_email": contribution.contributor.email,
                "contribution_amount": contribution.formatted_amount,
                "contribution_interval": contribution.interval,
                "contribution_interval_display_value": contribution.interval
                if contribution.interval != "one_time"
                else None,
                "copyright_year": now.year,
                "org_name": contribution.revenue_program.organization.name,
                "contributor_name": customer.name,
                "non_profit": contribution.revenue_program.non_profit,
                "tax_id": contribution.revenue_program.tax_id,
                "magic_link": magic_link,
            },
        )

    def test_when_contribution_not_exist(self, monkeypatch):
        now = timezone.now()
        contribution_id = "999"
        assert not Contribution.objects.filter(id=contribution_id).exists()
        mock_log_exception = Mock()
        monkeypatch.setattr("apps.emails.tasks.logger.exception", mock_log_exception)
        with pytest.raises(Contribution.DoesNotExist):
            send_thank_you_email(contribution_id, now.date(), now.year)
        mock_log_exception.assert_called_once()

    def test_when_contribution_not_have_provider_customer_id(self, monkeypatch):
        now = timezone.now()
        contribution = ContributionFactory(provider_customer_id=None)
        mock_log_exception = Mock()
        monkeypatch.setattr("apps.emails.tasks.logger.exception", mock_log_exception)
        with pytest.raises(ValueError):
            send_thank_you_email(contribution.id, now.date(), now.year)
        mock_log_exception.assert_called_once()

    def test_when_stripe_error(self, monkeypatch):
        now = timezone.now()
        contribution = ContributionFactory(provider_customer_id="something")
        mock_customer_retrieve = Mock(side_effect=StripeError("Error"))
        monkeypatch.setattr("stripe.Customer.retrieve", mock_customer_retrieve)
        mock_log_exception = Mock()
        monkeypatch.setattr("apps.emails.tasks.logger.exception", mock_log_exception)
        with pytest.raises(StripeError):
            send_thank_you_email(contribution.id, now.date(), now.year)
        mock_log_exception.assert_called_once()
