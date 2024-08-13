from dataclasses import asdict
from unittest import TestCase
from unittest.mock import Mock, call, patch
from urllib.parse import quote_plus

from django.conf import settings
from django.core import mail
from django.template.loader import render_to_string

import pytest
from addict import Dict as AttrDict
from stripe.error import StripeError

from apps.contributions.models import ContributionInterval
from apps.contributions.tests.factories import ContributionFactory
from apps.emails.helpers import convert_to_timezone_formatted
from apps.emails.tasks import (
    EmailTaskException,
    SendContributionEmailData,
    generate_magic_link,
    logger,
    make_send_thank_you_email_data,
    send_templated_email_with_attachment,
    send_thank_you_email,
)
from apps.organizations.models import FiscalStatusChoices, FreePlan
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory, StyleFactory
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db()
class TestMagicLink:
    @pytest.mark.parametrize(
        "next_url",
        [None, "/mock-url/", "/mock-url/next/?mock=param"],
    )
    def test_generate_magic_link(self, mocker, next_url):
        user = UserFactory()
        revenue_program = RevenueProgramFactory()

        class MockSerializer:
            validated_data = {"access": "mock-token"}

            def is_valid(self, raise_exception=False):
                return None

            def update_short_lived_token(self, contributor):
                return None

        mock_contributor_serializer = mocker.patch(
            "apps.api.serializers.ContributorObtainTokenSerializer",
            return_value=MockSerializer(),
        )
        mock_construct_rp_domain = mocker.patch(
            "apps.api.views.construct_rp_domain",
            return_value="mock-domain",
        )
        redirect = f"&redirect={quote_plus(next_url)}" if next_url else ""
        expected = f"https://{mock_construct_rp_domain.return_value}/{settings.CONTRIBUTOR_VERIFY_URL}?token={mock_contributor_serializer().validated_data['access']}&email={quote_plus(user.email)}{redirect}"
        assert expected == generate_magic_link(user, revenue_program, next_url=next_url)


@pytest.mark.django_db()
class TestMakeSendThankYouEmailData:
    @pytest.fixture(params=["one_time_contribution", "monthly_contribution"])
    def contribution(self, request):
        return request.getfixturevalue(request.param)

    @pytest.mark.parametrize("custom_magic_link", ["custom-magic-link", None])
    @pytest.mark.parametrize("custom_timestamp", ["custom-timestamp", None])
    @pytest.mark.parametrize("show_billing_history", [False, True])
    def test_happy_path(self, contribution, custom_magic_link, custom_timestamp, show_billing_history, mocker):
        mock_fetch_customer = mocker.patch("stripe.Customer.retrieve", return_value=AttrDict(name="customer_name"))
        mock_get_magic_link = mocker.patch(
            "apps.contributions.models.Contributor.create_magic_link", return_value="magic_link"
        )
        expected = SendContributionEmailData(
            contribution_amount=contribution.formatted_amount,
            timestamp=custom_timestamp or convert_to_timezone_formatted(contribution.created, "America/New_York"),
            contribution_interval_display_value=(
                contribution.interval if contribution.interval != ContributionInterval.ONE_TIME else ""
            ),
            contribution_interval=contribution.interval,
            contributor_email=contribution.contributor.email,
            contributor_name=mock_fetch_customer.return_value.name,
            copyright_year=contribution.created.year,
            fiscal_sponsor_name=contribution.revenue_program.fiscal_sponsor_name,
            fiscal_status=contribution.revenue_program.fiscal_status,
            magic_link=custom_magic_link or mock_get_magic_link.return_value,
            non_profit=contribution.revenue_program.non_profit,
            rp_name=contribution.revenue_program.name,
            rp_email=contribution.revenue_program.contact_email,
            style=asdict(contribution.revenue_program.transactional_email_style),
            tax_id=contribution.revenue_program.tax_id,
            show_upgrade_prompt=False,
            billing_history=contribution.get_billing_history(),
            show_billing_history=show_billing_history,
        )
        actual = make_send_thank_you_email_data(
            contribution,
            show_billing_history=show_billing_history,
            custom_magic_link=custom_magic_link,
            custom_timestamp=custom_timestamp,
        )
        assert expected == actual

    def test_when_no_provider_customer_id(self, mocker):
        logger_spy = mocker.spy(logger, "error")
        contribution = ContributionFactory(one_time=True, provider_customer_id=None)
        with pytest.raises(EmailTaskException):
            make_send_thank_you_email_data(contribution)
        logger_spy.assert_called_once_with(
            "make_send_thank_you_email_data: No Stripe customer id for contribution with id %s", contribution.id
        )

    def test_when_error_retrieving_stripe_customer(self, mocker):
        mocker.patch("stripe.Customer.retrieve", side_effect=StripeError("error"))
        with pytest.raises(EmailTaskException):
            make_send_thank_you_email_data(ContributionFactory(one_time=True))


@pytest.mark.django_db()
class TestSendThankYouEmail:
    @pytest.mark.parametrize(
        "make_contribution_fn",
        [
            lambda: ContributionFactory(one_time=True),
            lambda: ContributionFactory(monthly_subscription=True),
        ],
    )
    @pytest.mark.parametrize("show_billing_history", [False, True])
    def test_happy_path(self, make_contribution_fn, show_billing_history, mocker):
        mocker.patch("apps.contributions.models.Contributor.create_magic_link", return_value="magic_link")
        mocker.patch("stripe.Customer.retrieve", return_value=AttrDict(name="customer_name"))
        mock_send_mail = mocker.patch("apps.emails.tasks.send_mail")
        contribution = make_contribution_fn()
        data = make_send_thank_you_email_data(contribution, show_billing_history=show_billing_history)

        send_thank_you_email(data)

        email_html = render_to_string("nrh-default-contribution-confirmation-email.html", context=data)

        if show_billing_history and data["billing_history"]:
            assert "Billing History" in email_html
            for history in data["billing_history"]:
                assert f"<p class=\"billing-history-value\">{history['payment_status']}</p>" in email_html
        else:
            assert "Billing History" not in email_html

        mock_send_mail.assert_called_once_with(
            subject="Thank you for your contribution!",
            message=render_to_string("nrh-default-contribution-confirmation-email.txt", context=data),
            from_email=settings.EMAIL_DEFAULT_TRANSACTIONAL_SENDER,
            recipient_list=[contribution.contributor.email],
            html_message=email_html,
        )

    @pytest.fixture(
        params=[
            "free_plan_revenue_program",
            "core_plan_revenue_program",
            "plus_plan_revenue_program",
        ]
    )
    def revenue_program(self, request):
        return request.getfixturevalue(request.param)

    @pytest.mark.parametrize(
        "default_style",
        [False, True],
    )
    def test_contribution_confirmation_email_style(
        self, revenue_program: RevenueProgramFactory, default_style: bool, monkeypatch
    ):
        customer = AttrDict({"name": "Foo Bar"})
        mock_customer_retrieve = Mock()
        mock_customer_retrieve.return_value = customer
        monkeypatch.setattr("stripe.Customer.retrieve", mock_customer_retrieve)
        contribution = ContributionFactory(provider_customer_id="something", interval=ContributionInterval.ONE_TIME)
        if default_style:
            style = StyleFactory()
            style.styles = style.styles | {
                "colors": {
                    "cstm_mainHeader": "#mock-header-background",
                    "cstm_CTAs": "#mock-button-color",
                },
                "font": {"heading": "mock-header-font", "body": "mock-body-font"},
            }
            style.save()
            page = DonationPageFactory(
                revenue_program=revenue_program,
                styles=style,
                header_logo="mock-logo",
                header_logo_alt_text="Mock-Alt-Text",
            )
            revenue_program.default_donation_page = page
            revenue_program.save()
        contribution.donation_page.revenue_program = revenue_program
        contribution.donation_page.save()
        data = make_send_thank_you_email_data(contribution)
        send_thank_you_email(data)

        default_logo = f"{settings.SITE_URL}/static/nre-logo-yellow.png"
        default_alt_text = "News Revenue Hub"
        custom_logo = 'src="/media/mock-logo"'
        custom_alt_text = 'alt="Mock-Alt-Text"'
        custom_header_background = "background: #mock-header-background !important"
        custom_button_background = "background: #mock-button-color !important"

        if revenue_program.organization.plan.name == FreePlan.name or not default_style:
            expect_present = (default_logo, default_alt_text)
            expect_missing = (custom_logo, custom_alt_text, custom_button_background, custom_header_background)

        else:
            expect_present = (custom_logo, custom_alt_text, custom_header_background)
            # Email template doesn't have a button to apply the custom button color to
            expect_missing = (custom_button_background, default_logo, default_alt_text)

        for x in expect_present:
            assert x in mail.outbox[0].alternatives[0][0]
        for x in expect_missing:
            assert x not in mail.outbox[0].alternatives[0][0]

    @pytest.mark.parametrize(
        ("fiscal_status", "has_tax_id"),
        [
            (FiscalStatusChoices.NONPROFIT, True),
            (FiscalStatusChoices.NONPROFIT, False),
            (FiscalStatusChoices.FISCALLY_SPONSORED, True),
            (FiscalStatusChoices.FISCALLY_SPONSORED, False),
            (FiscalStatusChoices.FOR_PROFIT, True),
            (FiscalStatusChoices.FOR_PROFIT, False),
        ],
    )
    def test_template_conditionality_around_non_profit_and_fiscal_sponsor_and_tax_status(
        self, fiscal_status, has_tax_id, monkeypatch, mocker
    ):
        customer = AttrDict({"name": "Foo Bar"})
        mock_customer_retrieve = Mock()
        mock_customer_retrieve.return_value = customer
        monkeypatch.setattr("stripe.Customer.retrieve", mock_customer_retrieve)
        contribution = ContributionFactory(
            one_time=True,
            donation_page__revenue_program=(
                rp := RevenueProgramFactory(
                    tax_id="123456789" if has_tax_id else None,
                    fiscal_status=fiscal_status,
                    fiscal_sponsor_name=(
                        "Mock-fiscal-sponsor-name" if fiscal_status == FiscalStatusChoices.FISCALLY_SPONSORED else None
                    ),
                )
            ),
        )
        data = make_send_thank_you_email_data(contribution)
        send_thank_you_email(data)

        non_profit_expectation = "This receipt may be used for tax purposes."
        for_profit_expectation = f"Contributions to {rp.name} are not deductible as charitable donations."
        non_profit_has_tax_id_expectation = f"with a Federal Tax ID #{rp.tax_id}."
        non_profit_no_tax_id_expectation = f"{rp.name} is a 501(c)(3) nonprofit organization."
        fiscal_sponsor_text = (
            f"All contributions or gifts to {rp.name} are tax deductible through our fiscal sponsor"
            f" {rp.fiscal_sponsor_name}."
        )
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
        data = {
            "logo_url": f"{settings.SITE_URL}/static/nre_logo_black_yellow.png",
        }
        send_templated_email_with_attachment(
            "to@to.com",
            "This is a subject",
            render_to_string("nrh-contribution-csv-email-body.txt", data),
            render_to_string("nrh-contribution-csv-email-body.html", data),
            "data",
            "text/csv",
            "contributions.csv",
        )
        calls = [
            call().attach(filename="contributions.csv", content=b"data", mimetype="text/csv"),
            call().attach_alternative(render_to_string("nrh-contribution-csv-email-body.html", data), "text/html"),
            call().send(),
        ]
        email_message.assert_has_calls(calls)
        expect_missing = (
            "Tired of manual exports and imports?",
            "Let us streamline your workflow",
            "https://fundjournalism.org/pricing/",
        )
        for x in expect_missing:
            assert x not in render_to_string("nrh-contribution-csv-email-body.html", data)

    def test_export_csv_free_organization(self):
        data = {
            "logo_url": f"{settings.SITE_URL}/static/nre_logo_black_yellow.png",
            "show_upgrade_prompt": True,
        }
        send_templated_email_with_attachment(
            "to@to.com",
            "This is a subject",
            render_to_string("nrh-contribution-csv-email-body.txt", data),
            render_to_string("nrh-contribution-csv-email-body.html", data),
            "data",
            "text/csv",
            "contributions.csv",
        )

        expect_present = (
            "Tired of manual exports and imports?",
            "Let us streamline your workflow",
            "https://fundjournalism.org/pricing/",
        )

        for x in expect_present:
            assert x in render_to_string("nrh-contribution-csv-email-body.html", data)
