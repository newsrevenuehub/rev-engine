import os
from dataclasses import asdict
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
from apps.emails.tasks import (
    EmailTaskException,
    send_templated_email_with_attachment,
    send_thank_you_email,
)
from apps.organizations.models import FiscalStatusChoices


@pytest.mark.django_db
class TestSendThankYouEmail:
    @pytest.mark.parametrize("interval", (ContributionInterval.ONE_TIME, ContributionInterval.MONTHLY))
    def test_happy_path(self, monkeypatch, interval, mocker):
        # TODO: DEV-3026 clean up here
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            contribution = ContributionFactory(provider_customer_id="something", interval=interval)
        customer = AttrDict({"name": "Foo Bar"})
        mock_customer_retrieve = Mock()
        mock_customer_retrieve.return_value = customer
        monkeypatch.setattr("stripe.Customer.retrieve", mock_customer_retrieve)
        magic_link = "something"
        mock_create_magic_link = Mock()
        mock_create_magic_link.return_value = magic_link
        mock_send_email = mocker.patch("apps.emails.tasks.send_mail")
        monkeypatch.setattr("apps.contributions.models.Contributor.create_magic_link", mock_create_magic_link)
        send_thank_you_email(contribution.id)
        expected_template_data = {
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
            "fiscal_status": contribution.revenue_program.fiscal_status,
            "fiscal_sponsor_name": contribution.revenue_program.fiscal_sponsor_name,
            "style": asdict(contribution.donation_page.revenue_program.transactional_email_style),
        }
        mock_send_email.assert_called_once_with(
            subject="Thank you for your contribution!",
            message=render_to_string("nrh-default-contribution-confirmation-email.txt", context=expected_template_data),
            from_email=settings.EMAIL_DEFAULT_TRANSACTIONAL_SENDER,
            recipient_list=[contribution.contributor.email],
            html_message=render_to_string(
                "nrh-default-contribution-confirmation-email.html", context=expected_template_data
            ),
        )

    def test_when_contribution_not_exist(self):
        contribution_id = "999"
        assert not Contribution.objects.filter(id=contribution_id).exists()
        with pytest.raises(EmailTaskException):
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
        with pytest.raises(EmailTaskException, match=r"Cannot locate required data to send email"):
            send_thank_you_email(contribution.id)

    def test_when_missing_provider_customer_id(self):
        # TODO: DEV-3026 clean up here
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            contribution = ContributionFactory(provider_customer_id=None)
        with pytest.raises(EmailTaskException, match=r"Cannot locate required data to send email"):
            send_thank_you_email(contribution.id)

    def test_when_missing_page_revenue_program(self):
        # TODO: DEV-3026 clean up here
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            contribution = ContributionFactory(provider_customer_id="something")
        contribution.donation_page.revenue_program = None
        contribution.donation_page.save()
        with pytest.raises(EmailTaskException, match=r"Cannot locate required data to send email"):
            send_thank_you_email(contribution.id)

    def test_when_missing_page_revenue_program_payment_provider(self):
        # TODO: DEV-3026 clean up here
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            contribution = ContributionFactory(provider_customer_id="something")
        contribution.donation_page.revenue_program.payment_provider = None
        contribution.donation_page.revenue_program.save()
        with pytest.raises(EmailTaskException, match=r"Cannot locate required data to send email"):
            send_thank_you_email(contribution.id)

    @pytest.mark.parametrize(
        "fiscal_status,has_tax_id",
        (
            (FiscalStatusChoices.NONPROFIT, True),
            (FiscalStatusChoices.NONPROFIT, False),
            (FiscalStatusChoices.FISCALLY_SPONSORED, True),
            (FiscalStatusChoices.FISCALLY_SPONSORED, False),
            (FiscalStatusChoices.FOR_PROFIT, True),
            (FiscalStatusChoices.FOR_PROFIT, False),
        ),
    )
    def test_template_conditionality_around_non_profit_and_fiscal_sponsor_and_tax_status(
        self, fiscal_status, has_tax_id, monkeypatch
    ):
        customer = AttrDict({"name": "Foo Bar"})
        mock_customer_retrieve = Mock()
        mock_customer_retrieve.return_value = customer
        monkeypatch.setattr("stripe.Customer.retrieve", mock_customer_retrieve)
        # TODO: DEV-3026 clean up here
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            contribution = ContributionFactory(one_time=True)
            rp = contribution.donation_page.revenue_program
            rp.tax_id = "123456789" if has_tax_id else None
            rp.fiscal_status = fiscal_status
            rp.fiscal_sponsor_name = (
                "Mock-fiscal-sponsor-name" if fiscal_status == FiscalStatusChoices.FISCALLY_SPONSORED else None
            )
            rp.save()
            send_thank_you_email(contribution.id)

        non_profit_expectation = "This receipt may be used for tax purposes."
        for_profit_expectation = f"Contributions to {rp.name} are not deductible as charitable donations."
        non_profit_has_tax_id_expectation = f"with a Federal Tax ID #{rp.tax_id}."
        non_profit_no_tax_id_expectation = f"{rp.name} is a 501(c)(3) nonprofit organization."
        fiscal_sponsor_text = f"All contributions or gifts to {rp.name} are tax deductible through our fiscal sponsor {rp.fiscal_sponsor_name}."
        fiscal_sponsor_has_tax_id_expectation = f"{rp.fiscal_sponsor_name}'s tax ID is {rp.tax_id}"

        if fiscal_status == FiscalStatusChoices.NONPROFIT and has_tax_id:
            expect_present = (non_profit_expectation, non_profit_has_tax_id_expectation)
            expect_missing = (
                for_profit_expectation,
                non_profit_no_tax_id_expectation,
                fiscal_sponsor_text,
                fiscal_sponsor_has_tax_id_expectation,
            )

        elif fiscal_status == FiscalStatusChoices.NONPROFIT and not has_tax_id:
            expect_present = (non_profit_expectation, non_profit_no_tax_id_expectation)
            expect_missing = (
                for_profit_expectation,
                non_profit_has_tax_id_expectation,
                fiscal_sponsor_text,
                fiscal_sponsor_has_tax_id_expectation,
            )

        elif fiscal_status == FiscalStatusChoices.FISCALLY_SPONSORED and has_tax_id:
            expect_present = (non_profit_expectation, fiscal_sponsor_text, fiscal_sponsor_has_tax_id_expectation)
            expect_missing = (
                for_profit_expectation,
                non_profit_has_tax_id_expectation,
                non_profit_no_tax_id_expectation,
            )

        elif fiscal_status == FiscalStatusChoices.FISCALLY_SPONSORED and not has_tax_id:
            expect_present = (non_profit_expectation, fiscal_sponsor_text)
            expect_missing = (
                for_profit_expectation,
                non_profit_has_tax_id_expectation,
                non_profit_no_tax_id_expectation,
                fiscal_sponsor_has_tax_id_expectation,
            )

        else:
            expect_present = (for_profit_expectation,)
            expect_missing = (
                non_profit_expectation,
                non_profit_has_tax_id_expectation,
                non_profit_no_tax_id_expectation,
                fiscal_sponsor_text,
                fiscal_sponsor_has_tax_id_expectation,
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
