import datetime
from dataclasses import asdict
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
    CONTRIBUTOR_DEFAULT_VALUE,
    EmailTaskException,
    SendContributionEmailData,
    generate_email_data,
    get_test_magic_link,
    logger,
    send_receipt_email,
    send_templated_email_with_attachment,
)
from apps.organizations.models import FiscalStatusChoices, FreePlan
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory, StyleFactory
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestMagicLink:
    def test_get_test_magic_link(self, mocker):
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
        expected = f"https://{mock_construct_rp_domain.return_value}/{settings.CONTRIBUTOR_VERIFY_URL}?token={mock_contributor_serializer().validated_data['access']}&email={quote_plus(user.email)}"
        assert expected == get_test_magic_link(user, revenue_program)


@pytest.mark.django_db
class TestGenerateEmailData:
    @pytest.fixture(params=["one_time_contribution", "monthly_contribution"])
    def contribution(self, request):
        return request.getfixturevalue(request.param)

    @pytest.mark.parametrize("show_billing_history", [False, True])
    @pytest.mark.parametrize(
        ("customer", "expected_name"),
        [
            (AttrDict(name="customer_name"), "customer_name"),
            (AttrDict(name=None), CONTRIBUTOR_DEFAULT_VALUE),
            (AttrDict(), CONTRIBUTOR_DEFAULT_VALUE),
        ],
    )
    @pytest.mark.parametrize("custom_timestamp", ["custom_timestamp", None])
    @pytest.mark.parametrize("has_donation_page", [True, False])
    def test_happy_path(
        self,
        contribution,
        show_billing_history,
        customer,
        expected_name,
        custom_timestamp,
        has_donation_page,
        mocker,
    ):
        mocker.patch("stripe.Customer.retrieve", return_value=customer)
        mock_customizations = {}
        mocker.patch("apps.emails.helpers.make_customizations_dict", return_value=mock_customizations)
        mock_contributor_portal_url = mocker.patch(
            "apps.organizations.models.RevenueProgram.contributor_portal_url",
            return_value="contributor_portal_url",
            new_callable=mocker.PropertyMock,
        )
        if has_donation_page:
            contribution.revenue_program.default_donation_page = DonationPageFactory()
            contribution.revenue_program.default_donation_page.save()

        expected = SendContributionEmailData(
            contribution_amount=contribution.formatted_amount,
            timestamp=custom_timestamp or convert_to_timezone_formatted(contribution.created, "America/New_York"),
            contribution_interval_display_value=(
                contribution.interval if contribution.interval != ContributionInterval.ONE_TIME else ""
            ),
            contribution_interval=contribution.interval,
            contributor_email=contribution.contributor.email,
            contributor_name=expected_name,
            copyright_year=datetime.datetime.now(datetime.timezone.utc).year,
            customizations=mock_customizations,
            fiscal_sponsor_name=contribution.revenue_program.fiscal_sponsor_name,
            fiscal_status=contribution.revenue_program.fiscal_status,
            non_profit=contribution.revenue_program.non_profit,
            portal_url=mock_contributor_portal_url.return_value,
            rp_name=contribution.revenue_program.name,
            style=asdict(contribution.revenue_program.transactional_email_style),
            tax_id=contribution.revenue_program.tax_id,
            show_upgrade_prompt=False,
            billing_history=contribution.get_billing_history(),
            show_billing_history=show_billing_history,
            default_contribution_page_url=(
                contribution.revenue_program.default_donation_page.page_url
                if contribution.revenue_program.default_donation_page
                else None
            ),
        )
        actual = generate_email_data(
            contribution, show_billing_history=show_billing_history, custom_timestamp=custom_timestamp
        )
        assert expected == actual

    def test_when_no_provider_customer_id(self, mocker):
        logger_spy = mocker.spy(logger, "error")
        contribution = ContributionFactory(one_time=True, provider_customer_id=None)
        with pytest.raises(EmailTaskException):
            generate_email_data(contribution)
        logger_spy.assert_called_once_with("No Stripe customer id for contribution with id %s", contribution.id)

    def test_when_error_retrieving_stripe_customer(self, mocker):
        mocker.patch("stripe.Customer.retrieve", side_effect=StripeError("error"))
        with pytest.raises(EmailTaskException):
            generate_email_data(ContributionFactory(one_time=True))


@pytest.mark.django_db
class TestSendReceiptEmail:
    @pytest.mark.parametrize(
        "make_contribution_fn",
        [
            lambda: ContributionFactory(one_time=True),
            lambda: ContributionFactory(monthly_subscription=True),
        ],
    )
    @pytest.mark.parametrize("show_billing_history", [False, True])
    @pytest.mark.parametrize("contributor_name", ["John Doe", None])
    def test_happy_path(self, make_contribution_fn, show_billing_history, contributor_name, mocker):
        mocker.patch(
            "apps.organizations.models.RevenueProgram.contributor_portal_url",
            return_value="contributor_portal_url",
            new_callable=mocker.PropertyMock,
        )
        mocker.patch("stripe.Customer.retrieve", return_value=AttrDict(name=contributor_name))
        mock_send_mail = mocker.patch("apps.emails.tasks.send_mail")
        contribution = make_contribution_fn()
        data = generate_email_data(contribution, show_billing_history=show_billing_history)

        send_receipt_email(data)

        email_html = render_to_string("nrh-default-contribution-confirmation-email.html", context=data)

        if show_billing_history and data["billing_history"]:
            assert "Billing History" in email_html
            for history in data["billing_history"]:
                assert f"<p class=\"billing-history-value\">{history['payment_status']}</p>" in email_html
        else:
            assert "Billing History" not in email_html

        assert f"Dear {contributor_name}," if contributor_name else "Dear contributor," in email_html

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
        self, revenue_program: RevenueProgramFactory, default_style: bool, monkeypatch, mocker
    ):
        customer = AttrDict({"name": "Foo Bar"})
        mock_customer_retrieve = mocker.Mock()
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
        data = generate_email_data(contribution)
        send_receipt_email(data)

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
        mock_customer_retrieve = mocker.Mock()
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
        data = generate_email_data(contribution)
        send_receipt_email(data)

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


def test_send_templated_email_with_attachment(mocker):
    email_message = mocker.patch("apps.emails.tasks.EmailMultiAlternatives")
    send_templated_email_with_attachment(
        (to_email := "to@to.com"),
        (subject := "This is a subject"),
        (msg_as_text := "text"),
        (msg_as_html := "html"),
        (attachment := "data"),
        (mimetype := "text/csv"),
        (file_name := "contributions.csv"),
    )
    email_message.assert_called_once_with(
        to=(to_email,),
        subject=subject,
        body=msg_as_text,
        from_email=settings.EMAIL_DEFAULT_TRANSACTIONAL_SENDER,
    )
    email_message.return_value.attach.assert_called_once_with(
        filename=file_name, content=attachment.encode(), mimetype=mimetype
    )
    email_message.return_value.attach_alternative.assert_called_once_with(msg_as_html, "text/html")
    email_message.return_value.send.assert_called_once()
