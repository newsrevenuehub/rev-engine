import datetime
from unittest.mock import MagicMock, Mock, patch
from urllib.parse import quote_plus

from django.conf import settings
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from django.utils.safestring import mark_safe

import pytest
from addict import Dict as AttrDict
from bs4 import BeautifulSoup
from stripe.error import StripeError

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


# This is to squash a side effect in contribution.save
# TODO: DEV-3026
@patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None)
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

    def test_formatted_amount(self, mock_fetch_stripe_payment_method):
        target_format = "10.00 USD"
        self.assertEqual(self.contribution.formatted_amount, target_format)

    def test_str(self, mock_fetch_stripe_payment_method):
        self.assertEqual(
            str(self.contribution),
            f"{self.contribution.formatted_amount}, {self.contribution.created.strftime('%Y-%m-%d %H:%M:%S')}",
        )

    def test_expanded_bad_actor_score(self, mock_fetch_stripe_payment_method):
        # First, expanded_bad_actor_score should be none by default
        score = 2
        self.assertIsNone(self.contribution.expanded_bad_actor_score)
        self.contribution.bad_actor_score = score
        self.contribution.save()
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.expanded_bad_actor_score, Contribution.BAD_ACTOR_SCORES[2][1])

    def test_request_stripe_payment_method_details_when_new(self, mock_fetch_stripe_payment_method):
        """
        fetch_stripe_payment_method should be called when a new contribution is being created and it has a defined provider_payment_method_id
        """
        mock_fetch_stripe_payment_method.return_value = "some-fake-id"
        target_pm_id = "new-pm-id"
        contribution = Contribution(**self.required_data)
        contribution.provider_payment_method_id = target_pm_id
        contribution.save()
        mock_fetch_stripe_payment_method.assert_called_once()

    def test_request_stripe_payment_method_details_when_old_updating_payment_method(
        self, mock_fetch_stripe_payment_method
    ):
        """
        fetch_stripe_payment_method should be called when updating an existing contribution, if provider_payment_method_id is not the same as the previous
        """
        target_pm_id = "new-pm-id"
        self.contribution.provider_payment_method_id = target_pm_id
        self.contribution.save()
        mock_fetch_stripe_payment_method.assert_called_once()

    @patch("stripe.PaymentMethod.retrieve", side_effect="{}")
    def test_do_not_request_stripe_payment_method_details_when_updating_anything_else(
        self, mock_retrieve_pm, mock_fetch_stripe_payment_method
    ):
        """
        fetch_stripe_payment_method should not be called if provider_payment_method_id is unchanged
        """
        self.contribution.status = ContributionStatus.PAID
        self.contribution.save()
        mock_retrieve_pm.assert_not_called()

    @patch("stripe.PaymentIntent.create")
    def test_create_stripe_one_time_payment_intent(self, mock_create_pi, mock_fetch_stripe_payment_method):
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
    def test_create_stripe_subscription(self, mock_create_subscription, mock_fetch_stripe_payment_method):
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
    def test_handle_thank_you_email_when_nre_sends(self, mock_send_email, mock_fetch_stripe_payment_method):
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
    def test_handle_thank_you_email_when_nre_not_send(self, mock_send_email, mock_fetch_stripe_payment_method):
        """Show that when an org is not configured to have NRE send thank you emails...

        ...send_templated_email does not get called
        """
        self.org.send_receipt_email_via_nre = False
        self.org.save()
        self.contribution.handle_thank_you_email()
        mock_send_email.assert_not_called()

    def test_stripe_metadata(self, mock_fetch_stripe_payment_method):
        referer = "https://somewhere.com"
        campaign_id = "some-id"
        contribution = ContributionFactory()
        validated_data = {
            "agreed_to_pay_fees": True,
            "donor_selected_amount": "120",
            "reason_for_giving": "reason",
            "honoree": None,
            "in_memory_of": None,
            "comp_subscription": False,
            "swag_opt_out": True,
            "swag_choice": None,
            "page": contribution.donation_page,
            "sf_campaign_id": campaign_id,
        }
        assert Contribution.stripe_metadata(contribution.contributor, validated_data, referer) == {
            "source": settings.METADATA_SOURCE,
            "schema_version": settings.METADATA_SCHEMA_VERSION,
            "contributor_id": contribution.contributor.id,
            "agreed_to_pay_fees": validated_data["agreed_to_pay_fees"],
            "donor_selected_amount": validated_data["donor_selected_amount"],
            "reason_for_giving": validated_data["reason_for_giving"],
            "honoree": validated_data["honoree"],
            "in_memory_of": validated_data["in_memory_of"],
            "comp_subscription": validated_data["comp_subscription"],
            "swag_opt_out": validated_data["swag_opt_out"],
            "swag_choice": validated_data["swag_choice"],
            "referer": referer,
            "revenue_program_id": validated_data["page"].revenue_program.id,
            "revenue_program_slug": validated_data["page"].revenue_program.slug,
            "sf_campaign_id": validated_data["sf_campaign_id"],
        }


@pytest.mark.django_db
@pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
def test_contribution_billing_details(trait):
    # TODO: DEV-3026 -- remove provider_payment_method_id = None
    contribution = ContributionFactory(**{trait: True, "provider_payment_method_id": None})
    assert (
        contribution.billing_details
        and contribution.billing_details == contribution.provider_payment_method_details["billing_details"]
    )


@pytest.mark.django_db
@pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
def test_contribution_billing_name(trait):
    # TODO: DEV-3026  -- remove provider_payment_method_id = None
    contribution = ContributionFactory(**{trait: True, "provider_payment_method_id": None})
    assert contribution.billing_name and contribution.billing_name == contribution.billing_details.name


@pytest.mark.django_db
@pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
def test_contribution_billing_email(trait):
    # TODO: DEV-3026  -- remove provider_payment_method_id = None
    contribution = ContributionFactory(**{trait: True, "provider_payment_method_id": None})
    assert contribution.billing_email and contribution.billing_email == contribution.billing_details.email


@pytest.mark.django_db
@pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
def test_contribution_billing_phone(trait):
    # TODO: DEV-3026  -- remove provider_payment_method_id = None
    contribution = ContributionFactory(**{trait: True, "provider_payment_method_id": None})
    assert contribution.billing_phone and contribution.billing_phone == contribution.billing_details.phone


@pytest.mark.django_db
@pytest.mark.parametrize("trait", ("one_time", "annual_subscription", "monthly_subscription"))
def test_contribution_billing_address(trait):
    # TODO: DEV-3026  -- remove provider_payment_method_id = None
    contribution = ContributionFactory(**{trait: True, "provider_payment_method_id": None})
    assert contribution.billing_address


@pytest.mark.django_db
@pytest.mark.parametrize(
    "trait",
    (
        "one_time",
        "annual_subscription",
        "monthly_subscription",
    ),
)
def test_contribution_formatted_donor_selected_amount(trait):
    # TODO: DEV-3026  -- remove provider_payment_method_id = None
    kwargs = {trait: True, "provider_payment_method_id": None}
    contribution = ContributionFactory(**kwargs)
    assert (
        contribution.formatted_donor_selected_amount
        and contribution.formatted_donor_selected_amount
        == f"{'{:.2f}'.format(contribution.amount / 100)} {contribution.currency.upper()}"
    )


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
    # This is to squash a side effect in contribution.save
    # TODO: DEV-3026
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
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


@pytest.mark.parametrize(
    "has_account_id,has_subscription_id,expect_result",
    (
        (True, True, True),
        (True, False, False),
        (False, True, False),
        (False, False, False),
    ),
)
@pytest.mark.django_db
def test_contribution_stripe_subscription(has_account_id, has_subscription_id, expect_result, monkeypatch):
    kwargs = {"provider_subscription_id": "something" if has_subscription_id else None}
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        contribution = ContributionFactory(**kwargs)
    mock_sub_ret_value = {"foo": "bar"}
    mock_fn = Mock()
    mock_fn.return_value = mock_sub_ret_value
    monkeypatch.setattr("stripe.Subscription.retrieve", mock_fn)
    if not has_account_id:
        contribution.donation_page.revenue_program.payment_provider.stripe_account_id = None
        contribution.donation_page.revenue_program.payment_provider.save()
    if not expect_result:
        assert contribution.stripe_subscription is None
    else:
        assert contribution.stripe_subscription == mock_sub_ret_value


@pytest.mark.django_db
def test_contribution_stripe_subscription_when_stripe_error(monkeypatch):
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        contribution = ContributionFactory(annual_subscription=True)
    mock_fn = MagicMock()
    mock_fn.side_effect = StripeError("Ruh-roh")
    monkeypatch.setattr("stripe.Subscription.retrieve", mock_fn)
    with pytest.raises(StripeError):
        contribution.stripe_subscription


@pytest.mark.parametrize(
    "has_account_id,has_provider_payment_id,expect_result",
    (
        (True, True, True),
        (True, False, False),
        (False, True, False),
        (False, False, False),
    ),
)
@pytest.mark.django_db
def test_contribution_stripe_payment_intent(has_account_id, has_provider_payment_id, expect_result, monkeypatch):
    kwargs = {"one_time": True}
    if not has_provider_payment_id:
        kwargs["provider_payment_id"] = None
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        contribution = ContributionFactory(**kwargs)
    mock_pi_ret_value = {"foo": "bar"}
    mock_fn = Mock()
    mock_fn.return_value = mock_pi_ret_value
    monkeypatch.setattr("stripe.PaymentIntent.retrieve", mock_fn)
    if not has_account_id:
        contribution.donation_page.revenue_program.payment_provider.stripe_account_id = None
        contribution.donation_page.revenue_program.payment_provider.save()
    if not expect_result:
        assert contribution.stripe_subscription is None
    else:
        assert contribution.stripe_payment_intent == mock_pi_ret_value


@pytest.mark.django_db
def test_contribution_stripe_payment_intent_when_stripe_error(monkeypatch):
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        contribution = ContributionFactory(one_time=True)
    mock_fn = MagicMock()
    mock_fn.side_effect = StripeError("Ruh-roh")
    monkeypatch.setattr("stripe.PaymentIntent.retrieve", mock_fn)
    with pytest.raises(StripeError):
        contribution.stripe_payment_intent


@pytest.mark.parametrize("dry_run", (True, False))
@pytest.mark.django_db
def test_contribution_fix_contributions_stuck_in_processing(dry_run, monkeypatch):
    mock_pi = AttrDict(status="succeeded")
    mock_sub = AttrDict(status="active")
    monkeypatch.setattr("apps.contributions.models.Contribution.stripe_payment_intent", mock_pi)
    monkeypatch.setattr("apps.contributions.models.Contribution.stripe_subscription", mock_sub)
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        contributions = [
            ContributionFactory(one_time=True, status=ContributionStatus.PROCESSING),
            ContributionFactory(annual_subscription=True, status=ContributionStatus.PROCESSING),
        ]
        Contribution.fix_contributions_stuck_in_processing(dry_run=dry_run)
    if dry_run:
        for contribution in contributions:
            old_modified = contribution.modified
            contribution.refresh_from_db()
            assert contribution.modified == old_modified
    else:
        for contribution in contributions:
            contribution.refresh_from_db()
            assert contribution.status == ContributionStatus.PAID


@pytest.mark.parametrize("dry_run", (True, False))
@pytest.mark.django_db
def test_contribution_sync_missing_payment_method_detail_details_data(dry_run):
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        contributions = []
        for status in [
            ContributionStatus.PAID,
            ContributionStatus.FLAGGED,
            ContributionStatus.REJECTED,
            ContributionStatus.CANCELED,
        ]:
            contributions.extend(
                [
                    ContributionFactory(one_time=True, status=status, provider_payment_method_details=None),
                    ContributionFactory(annual_subscription=True, status=status, provider_payment_method_details=None),
                ]
            )
    mock_pm = {"foo": "bar"}
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=mock_pm):
        Contribution.fix_missing_payment_method_detail_details_data(dry_run=dry_run)
    for contribution in contributions:
        contribution.refresh_from_db()
        if not dry_run:
            assert contribution.provider_payment_method_details == mock_pm
        else:
            assert contribution.provider_payment_method_details is None
