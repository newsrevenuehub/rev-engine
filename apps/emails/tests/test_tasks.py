from unittest.mock import Mock

import pytest
from addict import Dict as AttrDict
from stripe.error import StripeError

from apps.contributions.models import Contribution, ContributionInterval
from apps.contributions.tests.factories import ContributionFactory
from apps.emails.helpers import convert_to_timezone_formatted
from apps.emails.tasks import send_thank_you_email
from apps.organizations.models import PaymentProvider
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory


@pytest.mark.django_db
class TestSendThankYouEmail:
    @pytest.mark.parametrize("interval", (ContributionInterval.ONE_TIME, ContributionInterval.MONTHLY))
    def test_happy_path(self, monkeypatch, interval):
        contribution = ContributionFactory(provider_customer_id="something", interval=interval)
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
        send_thank_you_email(contribution.id)
        assert mock_send_email.called_once_with(
            contribution.contributor.email,
            "Thank you for your contribution!",
            "nrh-default-contribution-confirmation-email.txt",
            "nrh-default-contribution-confirmation-email.html",
            {
                "contribution_date": convert_to_timezone_formatted(contribution.created, "America/New_York"),
                "contributor_email": contribution.contributor.email,
                "contribution_amount": contribution.formatted_amount,
                "contribution_interval": contribution.interval,
                "contribution_interval_display_value": contribution.interval
                if contribution.interval != "one_time"
                else None,
                "copyright_year": contribution.created.year,
                "org_name": contribution.revenue_program.organization.name,
                "contributor_name": customer.name,
                "non_profit": contribution.revenue_program.non_profit,
                "tax_id": contribution.revenue_program.tax_id,
                "magic_link": magic_link,
            },
        )

    def test_when_contribution_not_exist(self):
        contribution_id = "999"
        assert not Contribution.objects.filter(id=contribution_id).exists()
        with pytest.raises(Contribution.DoesNotExist):
            send_thank_you_email(contribution_id)

    def test_when_stripe_error(self, monkeypatch):
        contribution = ContributionFactory(provider_customer_id="something")
        mock_customer_retrieve = Mock(side_effect=StripeError("Error"))
        monkeypatch.setattr("stripe.Customer.retrieve", mock_customer_retrieve)
        mock_log_exception = Mock()
        monkeypatch.setattr("apps.emails.tasks.logger.exception", mock_log_exception)
        with pytest.raises(StripeError):
            send_thank_you_email(contribution.id)
        mock_log_exception.assert_called_once()

    def test_when_missing_donation_page(self, monkeypatch):
        contribution = ContributionFactory(provider_customer_id="something")
        contribution.donation_page = None
        contribution.save()
        with pytest.raises(Contribution.DoesNotExist):
            send_thank_you_email(contribution.id)
        contribution.donation_page = DonationPageFactory()
        contribution.save()
        mock_customer_retrieve = Mock()
        customer = AttrDict({"name": "Foo Bar"})
        mock_customer_retrieve.return_value = customer
        monkeypatch.setattr("stripe.Customer.retrieve", mock_customer_retrieve)
        send_thank_you_email(contribution.id)

    def test_when_missing_provider_customer_id(self, monkeypatch):
        contribution = ContributionFactory(provider_customer_id=None)
        with pytest.raises(Contribution.DoesNotExist):
            send_thank_you_email(contribution.id)
        customer = AttrDict({"name": "Foo Bar"})
        mock_customer_retrieve = Mock()
        mock_customer_retrieve.return_value = customer
        monkeypatch.setattr("stripe.Customer.retrieve", mock_customer_retrieve)
        contribution.provider_customer_id = "something"
        contribution.save()
        send_thank_you_email(contribution.id)

    def test_when_missing_page_revenue_program(self, monkeypatch):
        contribution = ContributionFactory(provider_customer_id="something")
        contribution.donation_page.revenue_program = None
        contribution.donation_page.save()
        with pytest.raises(Contribution.DoesNotExist):
            send_thank_you_email(contribution.id)
        customer = AttrDict({"name": "Foo Bar"})
        mock_customer_retrieve = Mock()
        mock_customer_retrieve.return_value = customer
        monkeypatch.setattr("stripe.Customer.retrieve", mock_customer_retrieve)
        contribution.donation_page.revenue_program = RevenueProgramFactory()
        contribution.donation_page.save()
        send_thank_you_email(contribution.id)

    def test_when_missing_page_revenue_program_payment_provider(self, monkeypatch):
        contribution = ContributionFactory(provider_customer_id="something")
        assert isinstance(provider := contribution.donation_page.revenue_program.payment_provider, PaymentProvider)
        contribution.donation_page.revenue_program.payment_provider = None
        contribution.donation_page.revenue_program.save()
        with pytest.raises(Contribution.DoesNotExist):
            send_thank_you_email(contribution.id)
        contribution.revenue_program.payment_provider = provider
        contribution.revenue_program.save()
        customer = AttrDict({"name": "Foo Bar"})
        mock_customer_retrieve = Mock()
        mock_customer_retrieve.return_value = customer
        monkeypatch.setattr("stripe.Customer.retrieve", mock_customer_retrieve)
        send_thank_you_email(contribution.id)
