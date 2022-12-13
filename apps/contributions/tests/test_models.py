import datetime
from unittest.mock import Mock, patch
from urllib.parse import quote_plus

from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from django.utils.safestring import mark_safe

import pytest
from bs4 import BeautifulSoup

from apps.api.views import construct_rp_domain
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Contributor,
    ContributorRefreshToken,
    logger,
    send_templated_email,
)
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.organizations.tests.factories import (
    OrganizationFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
)
from apps.pages.tests.factories import DonationPageFactory
from apps.slack.models import SlackNotificationTypes


class ContributorTest(TestCase):
    def setUp(self):
        self.contributor = Contributor.objects.create(email="test@test.com")

    def test_contributions_count(self):
        target_count = 5
        for _ in range(target_count):
            Contribution.objects.create(amount=1000, contributor=self.contributor)
        self.assertEqual(self.contributor.contributions_count, target_count)

    def test_most_recent_contribution(self):
        Contribution.objects.create(amount=1000, contributor=self.contributor, status="paid")
        one_minute = datetime.timedelta(minutes=1)
        second_contribution = Contribution.objects.create(
            amount=1000,
            contributor=self.contributor,
            status="paid",
            modified=timezone.now() + one_minute,
        )
        self.assertEqual(self.contributor.most_recent_contribution, second_contribution)

    def test__str(self):
        self.assertEqual(str(self.contributor), self.contributor.email)

    def test_is_superuser(self):
        self.assertFalse(self.contributor.is_superuser)

    @patch("stripe.Customer.create")
    def test_create_stripe_customer(self, mock_create_customer):
        """Show Contributor.create_stripe_customer calls Stripe with right params and returns the customer object"""
        return_value = {}
        mock_create_customer.return_value = return_value
        call_args = {
            "rp_stripe_account_id": "fake_rp_stripe_id",
            "customer_name": "Jane Doe",
            "phone": "555-555-5555",
            "street": "123 Street Lane",
            "city": "Small Town",
            "state": "OK",
            "postal_code": "12345",
            "country": "US",
            "metadata": {"meta": "data"},
        }
        customer = self.contributor.create_stripe_customer(**call_args)
        address = {
            "line1": call_args["street"],
            "city": call_args["city"],
            "state": call_args["state"],
            "postal_code": call_args["postal_code"],
            "country": call_args["country"],
        }
        mock_create_customer.assert_called_once_with(
            email=self.contributor.email,
            address=address,
            shipping={"address": address, "name": call_args["customer_name"]},
            name=call_args["customer_name"],
            phone=call_args["phone"],
            stripe_account=call_args["rp_stripe_account_id"],
            metadata=call_args["metadata"],
        )
        self.assertEqual(customer, return_value)


test_key = "test_key"


@override_settings(STRIPE_TEST_SECRET_KEY=test_key)
class ContributionTest(TestCase):
    def setUp(self):
        self.amount = 1000
        self.stripe_account_id = "testing-123-stripe"
        self.org = OrganizationFactory()
        self.payment_provider = PaymentProviderFactory(stripe_account_id=self.stripe_account_id)
        self.revenue_program = RevenueProgramFactory(organization=self.org, payment_provider=self.payment_provider)
        self.donation_page = DonationPageFactory(revenue_program=self.revenue_program)
        self.contribution = Contribution.objects.create(amount=self.amount, donation_page=self.donation_page)
        self.required_data = {"amount": 1000, "currency": "usd", "donation_page": self.donation_page}

    def test_formatted_amount(self):
        target_format = "10.00 USD"
        self.assertEqual(self.contribution.formatted_amount, target_format)

    def test_str(self):
        self.assertEqual(
            str(self.contribution),
            f"{self.contribution.formatted_amount}, {self.contribution.created.strftime('%Y-%m-%d %H:%M:%S')}",
        )

    def test_expanded_bad_actor_score(self):
        # First, expanded_bad_actor_score should be none by default
        score = 2
        self.assertIsNone(self.contribution.expanded_bad_actor_score)
        self.contribution.bad_actor_score = score
        self.contribution.save()
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.expanded_bad_actor_score, Contribution.BAD_ACTOR_SCORES[2][1])

    @patch("apps.contributions.models.Contribution.send_slack_notifications")
    def test_save_without_slack_arg_only_saves(self, mock_send_slack):
        self.contribution.amount = 10
        self.contribution.save()
        mock_send_slack.assert_not_called()

    @patch("apps.contributions.models.SlackManager")
    def test_save_with_slack_arg_sends_slack_notifications(self, mock_send_slack):
        self.contribution.amount = 10
        self.contribution.save(slack_notification=SlackNotificationTypes.SUCCESS)
        mock_send_slack.assert_any_call()

    @patch("stripe.PaymentMethod.retrieve", side_effect="{}")
    def test_request_stripe_payment_method_details_when_new(self, mock_retrieve_pm):
        """
        fetch_stripe_payment_method should be called when a new contribution is being created and it has a defined provider_payment_method_id
        """
        target_pm_id = "new-pm-id"
        contribution = Contribution(**self.required_data)
        contribution.provider_payment_method_id = target_pm_id
        contribution.save()
        mock_retrieve_pm.assert_called_once_with(target_pm_id, stripe_account=self.stripe_account_id)

    @patch("stripe.PaymentMethod.retrieve", side_effect="{}")
    def test_request_stripe_payment_method_details_when_old_updating_payment_method(self, mock_retrieve_pm):
        """
        fetch_stripe_payment_method should be called when updating an existing contribution, if provider_payment_method_id is not the same as the previous
        """
        target_pm_id = "new-pm-id"
        self.contribution.provider_payment_method_id = target_pm_id
        self.contribution.save()
        mock_retrieve_pm.assert_called_once_with(target_pm_id, stripe_account=self.stripe_account_id)

    @patch("stripe.PaymentMethod.retrieve", side_effect="{}")
    def test_do_not_request_stripe_payment_method_details_when_updating_anything_else(self, mock_retrieve_pm):
        """
        fetch_stripe_payment_method should not be called if provider_payment_method_id is unchanged
        """
        self.contribution.status = ContributionStatus.PAID
        self.contribution.save()
        mock_retrieve_pm.assert_not_called()

    @patch("stripe.PaymentIntent.create")
    def test_create_stripe_one_time_payment_intent(self, mock_create_pi):
        """Show Contribution.create_stripe_one_time_payment_intent calls Stripe with right params...

        ...that it returns the created payment intent, and that it saves the payment intent ID and
        client secret back to the contribution
        """
        stripe_customer_id = "fake_stripe_customer_id"
        return_value = {"id": "fake_id", "client_secret": "fake_client_secret", "customer": stripe_customer_id}
        mock_create_pi.return_value = return_value
        metadata = {"meta": "data"}
        contributor = ContributorFactory()
        self.contribution.contributor = contributor
        self.contribution.save()

        payment_intent = self.contribution.create_stripe_one_time_payment_intent(stripe_customer_id, metadata)
        mock_create_pi.assert_called_once_with(
            amount=self.contribution.amount,
            currency=self.contribution.currency,
            customer=stripe_customer_id,
            metadata=metadata,
            receipt_email=contributor.email,
            statement_descriptor_suffix=self.revenue_program.stripe_statement_descriptor_suffix,
            stripe_account=self.revenue_program.stripe_account_id,
        )
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.provider_payment_id, return_value["id"])
        self.assertEqual(self.contribution.provider_client_secret_id, return_value["client_secret"])
        self.assertEqual(payment_intent, return_value)
        assert self.contribution.provider_customer_id == stripe_customer_id

    @patch("stripe.Subscription.create")
    def test_create_stripe_subscription(self, mock_create_subscription):
        """Show Contribution.create_stripe_subscription calls Stripe with right params...

        ...that it returns the created subscription, and that it saves the right subscription data
        back to the contribution
        """
        stripe_customer_id = "fake_stripe_customer_id"
        return_value = {
            "id": "fake_id",
            "latest_invoice": {"payment_intent": {"client_secret": "fake_client_secret"}},
            "customer": stripe_customer_id,
        }
        mock_create_subscription.return_value = return_value
        metadata = {"meta": "data"}
        contributor = ContributorFactory()
        self.contribution.contributor = contributor
        self.contribution.interval = "month"
        self.contribution.save()

        subscription = self.contribution.create_stripe_subscription(stripe_customer_id, metadata)
        mock_create_subscription.assert_called_once_with(
            customer=stripe_customer_id,
            items=[
                {
                    "price_data": {
                        "unit_amount": self.contribution.amount,
                        "currency": self.contribution.currency,
                        "product": self.payment_provider.stripe_product_id,
                        "recurring": {"interval": self.contribution.interval},
                    }
                }
            ],
            stripe_account=self.revenue_program.stripe_account_id,
            metadata=metadata,
            payment_behavior="default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
        )
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.payment_provider_data, return_value)
        self.assertEqual(self.contribution.provider_subscription_id, return_value["id"])
        self.assertEqual(
            self.contribution.provider_client_secret_id,
            return_value["latest_invoice"]["payment_intent"]["client_secret"],
        )
        self.assertEqual(subscription, return_value)
        assert self.contribution.provider_customer_id == stripe_customer_id

    @patch("apps.emails.tasks.send_templated_email.delay")
    def test_handle_thank_you_email_when_nre_sends(self, mock_send_email):
        """Show that when org configured to have NRE send thank you emails, send_templated_email
        gets called with expected args.
        """
        self.org.send_receipt_email_via_nre = True
        self.org.save()
        contributor = ContributorFactory()
        self.contribution.contributor = contributor
        self.contribution.interval = "month"
        self.contribution.save()
        contribution_received_at = timezone.now()
        self.contribution.handle_thank_you_email(contribution_received_at)
        mock_send_email.assert_called_once_with(
            contributor.email,
            "Thank you for your contribution!",
            "nrh-default-contribution-confirmation-email.txt",
            "nrh-default-contribution-confirmation-email.html",
            {
                "contribution_date": contribution_received_at.strftime("%m-%d-%y"),
                "contributor_email": contributor.email,
                "contribution_amount": self.contribution.formatted_amount,
                "contribution_interval": self.contribution.interval,
                "contribution_interval_display_value": self.contribution.interval,
                "copyright_year": contribution_received_at.year,
                "org_name": self.org.name,
            },
        )

    @patch("apps.emails.tasks.send_templated_email.delay")
    def test_handle_thank_you_email_when_nre_not_send(self, mock_send_email):
        """Show that when an org is not configured to have NRE send thank you emails...

        ...send_templated_email does not get called
        """
        self.org.send_receipt_email_via_nre = False
        self.org.save()
        self.contribution.handle_thank_you_email()
        mock_send_email.assert_not_called()


@pytest.mark.django_db()
@pytest.mark.parametrize(
    "interval,expect_success",
    (
        (ContributionInterval.ONE_TIME, False),
        (ContributionInterval.MONTHLY, True),
        (ContributionInterval.YEARLY, True),
    ),
)
def test_contribution_send_recurring_contribution_email_reminder(interval, expect_success, monkeypatch, settings):
    contribution = ContributionFactory(interval=interval)
    next_charge_date = datetime.datetime.now()
    mock_log_warning = Mock()
    mock_send_templated_email = Mock(wraps=send_templated_email.delay)
    token = "token"

    class MockForContributorReturn:
        def __init__(self, *args, **kwargs):
            self.short_lived_access_token = token

    monkeypatch.setattr(logger, "warning", mock_log_warning)
    monkeypatch.setattr(send_templated_email, "delay", mock_send_templated_email)
    monkeypatch.setattr(ContributorRefreshToken, "for_contributor", lambda *args, **kwargs: MockForContributorReturn())
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    settings.CELERY_ALWAYS_EAGER = True
    contribution.send_recurring_contribution_email_reminder(next_charge_date)
    if expect_success:
        magic_link = mark_safe(
            f"https://{construct_rp_domain(contribution.donation_page.revenue_program.slug)}/{settings.CONTRIBUTOR_VERIFY_URL}"
            f"?token={token}&email={quote_plus(contribution.contributor.email)}"
        )
        mock_log_warning.assert_not_called()
        mock_send_templated_email.assert_called_once_with(
            contribution.contributor.email,
            f"Reminder: {contribution.donation_page.revenue_program.name} scheduled contribution",
            "recurring-contribution-email-reminder.txt",
            "recurring-contribution-email-reminder.html",
            {
                "rp_name": contribution.donation_page.revenue_program.name,
                "contribution_date": next_charge_date.strftime("%m/%d/%Y"),
                "contribution_amount": contribution.formatted_amount,
                "contribution_interval_display_value": contribution.interval,
                "non_profit": contribution.donation_page.revenue_program.non_profit,
                "contributor_email": contribution.contributor.email,
                "tax_id": contribution.donation_page.revenue_program.tax_id,
                "magic_link": magic_link,
            },
        )
        assert len(mail.outbox) == 1
    else:
        mock_log_warning.assert_called_once_with(
            "`Contribution.send_recurring_contribution_email_reminder` was called on an instance (ID: %s) whose interval is one-time",
            contribution.id,
        )


@pytest.mark.django_db()
@pytest.mark.parametrize(
    "is_non_profit,tax_id",
    (
        (True, None),
        (True, "123456789"),
        (False, None),
    ),
)
def test_contribution_send_recurring_contribution_email_reminder_email_text(
    is_non_profit, tax_id, monkeypatch, settings
):
    contribution = ContributionFactory(interval=ContributionInterval.YEARLY)
    contribution.donation_page.revenue_program.non_profit = is_non_profit
    contribution.donation_page.revenue_program.tax_id = tax_id
    contribution.donation_page.revenue_program.save()
    next_charge_date = datetime.datetime.now()
    mock_send_templated_email = Mock(wraps=send_templated_email.delay)
    token = "token"

    class MockForContributorReturn:
        def __init__(self, *args, **kwargs):
            self.short_lived_access_token = token

    monkeypatch.setattr(send_templated_email, "delay", mock_send_templated_email)
    monkeypatch.setattr(ContributorRefreshToken, "for_contributor", lambda *args, **kwargs: MockForContributorReturn())
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    settings.CELERY_ALWAYS_EAGER = True
    contribution.send_recurring_contribution_email_reminder(next_charge_date)
    magic_link = mark_safe(
        f"https://{construct_rp_domain(contribution.donation_page.revenue_program.slug)}/{settings.CONTRIBUTOR_VERIFY_URL}"
        f"?token={token}&email={quote_plus(contribution.contributor.email)}"
    )
    assert len(mail.outbox) == 1
    email_expectations = [
        f"Date Scheduled: {next_charge_date.strftime('%m/%d/%Y')}",
        f"Email: {contribution.contributor.email}",
        f"Amount Contributed: {contribution.formatted_amount}/{contribution.interval}",
    ]
    if is_non_profit:
        email_expectations.extend(
            [
                "This receipt may be used for tax purposes.",
                f"{contribution.donation_page.revenue_program.name} is a 501(c)(3) nonprofit organization",
            ]
        )
        if tax_id:
            email_expectations.append(f"with a Federal Tax ID #{tax_id}")
    else:
        email_expectations.append(
            f"Contributions to {contribution.donation_page.revenue_program.name} are not deductible as charitable donations."
        )
    for x in email_expectations:
        assert x in mail.outbox[0].body
        soup = BeautifulSoup(mail.outbox[0].alternatives[0][0], "html.parser")
        as_string = " ".join([x.replace("\xa0", " ").strip() for x in soup.get_text().splitlines() if x])
        assert x in as_string
    assert "Manage contributions here" in soup.find("a", href=magic_link).text
    assert magic_link in mail.outbox[0].body
