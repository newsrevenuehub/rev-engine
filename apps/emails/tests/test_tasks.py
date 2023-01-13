import os
from unittest import TestCase
from unittest.mock import Mock, call, patch

from django.conf import settings
from django.core import mail
from django.template.loader import render_to_string

import pytest
from addict import Dict as AttrDict
from stripe.error import StripeError

from apps.contributions.models import Contribution, ContributionInterval
from apps.contributions.tests.factories import ContributionFactory
from apps.emails.helpers import convert_to_timezone_formatted
from apps.emails.tasks import send_templated_email_with_attachment, send_thank_you_email
from apps.organizations.models import PaymentProvider
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory


@pytest.mark.django_db
class TestSendThankYouEmail:
    @pytest.mark.parametrize("interval", (ContributionInterval.ONE_TIME, ContributionInterval.MONTHLY))
    def test_happy_path(self, monkeypatch, interval):
        # TODO: DEV-3026 clean up here
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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
        assert mock_send_email.called_once()
        assert mock_send_email.call_args[0][0] == contribution.contributor.email
        assert mock_send_email.call_args[0][1] == "Thank you for your contribution!"
        assert mock_send_email.call_args[0][2] == "nrh-default-contribution-confirmation-email.txt"
        assert mock_send_email.call_args[0][3] == "nrh-default-contribution-confirmation-email.html"
        assert mock_send_email.call_args[0][4] == {
            "contribution_date": convert_to_timezone_formatted(contribution.created, "America/New_York"),
            "contributor_email": contribution.contributor.email,
            "contribution_amount": contribution.formatted_amount,
            "contribution_interval": contribution.interval,
            "contribution_interval_display_value": contribution.interval
            if contribution.interval != "one_time"
            else None,
            "copyright_year": contribution.created.year,
            "rp_name": contribution.revenue_program.name,
            "contributor_name": customer.name,
            "non_profit": contribution.revenue_program.non_profit,
            "tax_id": contribution.revenue_program.tax_id,
            "magic_link": magic_link,
            "logo_url": os.path.join(settings.SITE_URL, "static", "nre-logo-yellow.png"),
        }

    def test_when_contribution_not_exist(self):
        contribution_id = "999"
        assert not Contribution.objects.filter(id=contribution_id).exists()
        with pytest.raises(Contribution.DoesNotExist):
            send_thank_you_email(contribution_id)

    def test_when_stripe_error(self, monkeypatch):
        # TODO: DEV-3026 clean up here
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            contribution = ContributionFactory(one_time=True)
        mock_customer_retrieve = Mock(side_effect=StripeError("Error"))
        monkeypatch.setattr("stripe.Customer.retrieve", mock_customer_retrieve)
        mock_log_exception = Mock()
        monkeypatch.setattr("apps.emails.tasks.logger.exception", mock_log_exception)
        with pytest.raises(StripeError):
            send_thank_you_email(contribution.id)
        mock_log_exception.assert_called_once()

    def test_when_missing_donation_page(self, monkeypatch):
        # TODO: DEV-3026 clean up here
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            contribution = ContributionFactory(one_time=True)
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
        # TODO: DEV-3026 clean up here
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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
        # TODO: DEV-3026 clean up here
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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
        # TODO: DEV-3026 clean up here
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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

    @pytest.mark.parametrize(
        "is_non_profit,has_tax_id",
        (
            (True, True),
            (True, False),
            (False, True),
            (False, False),
        ),
    )
    def test_template_conditionality_around_non_profit_and_tax_status(self, is_non_profit, has_tax_id, monkeypatch):
        customer = AttrDict({"name": "Foo Bar"})
        mock_customer_retrieve = Mock()
        mock_customer_retrieve.return_value = customer
        monkeypatch.setattr("stripe.Customer.retrieve", mock_customer_retrieve)
        # TODO: DEV-3026 clean up here
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            contribution = ContributionFactory(one_time=True)
            rp = contribution.donation_page.revenue_program
            rp.tax_id = "123456789" if has_tax_id else None
            rp.non_profit = is_non_profit
            rp.save()
            send_thank_you_email(contribution.id)

        non_profit_expectation = "This receipt may be used for tax purposes."
        for_profit_expectation = f"Contributions to {rp.name} are not deductible as charitable donations."
        non_profit_has_tax_id_expectation = f"with a Federal Tax ID #{rp.tax_id}."
        non_profit_no_tax_id_expectation = f"{rp.name} is a 501(c)(3) nonprofit organization."

        if is_non_profit and has_tax_id:
            expect_present = (non_profit_expectation, non_profit_has_tax_id_expectation)
            expect_missing = (for_profit_expectation, non_profit_no_tax_id_expectation)

        elif is_non_profit and not has_tax_id:
            expect_present = (non_profit_expectation, non_profit_no_tax_id_expectation)
            expect_missing = (for_profit_expectation, non_profit_has_tax_id_expectation)

        else:
            expect_present = (for_profit_expectation,)
            expect_missing = (
                non_profit_expectation,
                non_profit_has_tax_id_expectation,
                non_profit_no_tax_id_expectation,
            )

        assert len(mail.outbox) == 1
        for x in expect_present:
            assert x in mail.outbox[0].body
            assert x in mail.outbox[0].alternatives[0][0]

        for x in expect_missing:
            assert x not in mail.outbox[0].body
            assert x not in mail.outbox[0].alternatives[0][0]


class TestTaskStripeContributions(TestCase):
    @patch("apps.emails.tasks.EmailMultiAlternatives")
    def test_task_pull_serialized_stripe_contributions_to_cache(self, email_message):
        template_data = {
            "username": "Test",
            "logo_url": os.path.join(settings.SITE_URL, "static", "nre_logo_black_yellow.png"),
        }
        send_templated_email_with_attachment(
            "to@to.com",
            "This is a subject",
            "nrh-contribution-csv-email-body.txt",
            "nrh-contribution-csv-email-body.html",
            template_data,
            "data",
            "text/csv",
            "contributions.csv",
        )
        calls = [
            call().attach(filename="contributions.csv", content="data".encode("utf-8"), mimetype="text/csv"),
            call().attach_alternative(
                render_to_string("nrh-contribution-csv-email-body.html", template_data), "text/html"
            ),
            call().send(),
        ]
        email_message.assert_has_calls(calls)
