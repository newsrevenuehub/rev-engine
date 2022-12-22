import datetime
from unittest.mock import Mock, patch

from django.conf import settings
from django.test import TestCase, override_settings
from django.utils import timezone

import pytest

from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionIntervalError,
    ContributionStatus,
    ContributionStatusError,
    Contributor,
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

    @patch("stripe.Customer.create")
    def test_create_stripe_customer(self, mock_create_customer):
        """Show Contributor.create_stripe_customer calls Stripe with right params and returns the customer object"""
        return_value = {"id": "some-id"}
        mock_create_customer.return_value = return_value
        call_args = {
            "first_name": "Jane",
            "last_name": "doe",
            "phone": "555-555-5555",
            "mailing_street": "123 Street Lane",
            "mailing_city": "Small Town",
            "mailing_state": "OK",
            "mailing_postal_code": "12345",
            "mailing_country": "US",
        }
        self.contribution.contributor = ContributorFactory()
        self.contribution.save()
        customer = self.contribution.create_stripe_customer(**call_args)
        name = f"{call_args['first_name']} {call_args['last_name']}"

        address = {
            "line1": call_args["mailing_street"],
            "city": call_args["mailing_city"],
            "state": call_args["mailing_state"],
            "postal_code": call_args["mailing_postal_code"],
            "country": call_args["mailing_country"],
        }
        mock_create_customer.assert_called_once_with(
            name=name,
            email=self.contribution.contributor.email,
            address=address,
            shipping={"address": address, "name": name},
            phone=call_args["phone"],
            stripe_account=self.contribution.donation_page.revenue_program.payment_provider.stripe_account_id,
        )
        self.assertEqual(customer, return_value)

    def test_formatted_amount(self):
        target_format = "10.00 USD"
        self.assertEqual(self.contribution.formatted_amount, target_format)

    def test_str(self):
        self.assertEqual(
            str(self.contribution),
            f"{self.contribution.formatted_amount}, {self.contribution.created.strftime('%Y-%m-%d %H:%M:%S')}",
        )

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
        self.contribution.provider_customer_id = stripe_customer_id
        self.contribution.contribution_metadata = metadata
        self.contribution.status = ContributionStatus.PROCESSING
        self.contribution.save()

        payment_intent = self.contribution.create_stripe_one_time_payment_intent()
        mock_create_pi.assert_called_once_with(
            amount=self.contribution.amount,
            currency=self.contribution.currency,
            customer=stripe_customer_id,
            receipt_email=contributor.email,
            metadata=self.contribution.contribution_metadata,
            statement_descriptor_suffix=self.revenue_program.stripe_statement_descriptor_suffix,
            stripe_account=self.revenue_program.stripe_account_id,
            capture_method="automatic",
        )
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.provider_payment_id, return_value["id"])
        self.assertEqual(payment_intent, return_value)

    @patch("stripe.PaymentIntent.create")
    def test_create_stripe_one_time_payment_intent_when_flagged(self, mock_create_pi):
        """Show Contribution.create_stripe_one_time_payment_intent calls Stripe with right params...

        ...that it returns the created payment intent, and that it saves the payment intent ID and
        client secret back to the contribution
        """
        stripe_customer_id = "fake_stripe_customer_id"
        return_value = {"id": "fake_id", "client_secret": "fake_client_secret", "customer": stripe_customer_id}
        mock_create_pi.return_value = return_value
        contributor = ContributorFactory()
        self.contribution.contributor = contributor
        self.contribution.provider_customer_id = stripe_customer_id
        self.contribution.status = ContributionStatus.FLAGGED
        self.contribution.save()

        payment_intent = self.contribution.create_stripe_one_time_payment_intent()
        mock_create_pi.assert_called_once_with(
            amount=self.contribution.amount,
            currency=self.contribution.currency,
            customer=stripe_customer_id,
            metadata=self.contribution.contribution_metadata,
            receipt_email=contributor.email,
            statement_descriptor_suffix=self.revenue_program.stripe_statement_descriptor_suffix,
            stripe_account=self.revenue_program.stripe_account_id,
            capture_method="manual",
        )
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.provider_payment_id, return_value["id"])
        self.assertEqual(payment_intent, return_value)

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
        self.contribution.provider_customer_id = stripe_customer_id
        self.contribution.contributor = contributor
        self.contribution.interval = "month"
        self.contribution.save()
        subscription = self.contribution.create_stripe_subscription(metadata)
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
            off_session=False,
            default_payment_method=None,
        )
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.payment_provider_data, return_value)
        self.assertEqual(self.contribution.provider_subscription_id, return_value["id"])
        self.assertEqual(subscription, return_value)

    @patch("stripe.SetupIntent.create")
    def test_create_stripe_setup_intent(self, mock_create_setup_intent):
        """Show Contribution.create_stripe_setup_intent calls Stripe with right params...

        ...that it returns the created setup intent, and that it saves the right data
        back to the contribution
        """
        stripe_customer_id = "fake_stripe_customer_id"
        return_value = {
            "id": "fake_id",
            "client_secret": "fake_client_secret",
        }
        mock_create_setup_intent.return_value = return_value
        metadata = {"meta": "data"}
        contributor = ContributorFactory()
        self.contribution.contributor = contributor
        self.contribution.provider_customer_id = stripe_customer_id
        self.contribution.provider_customer_id = stripe_customer_id
        self.contribution.interval = "month"
        self.contribution.status = ContributionStatus.FLAGGED
        self.contribution.save()

        subscription = self.contribution.create_stripe_setup_intent(metadata)
        mock_create_setup_intent.assert_called_once_with(
            customer=stripe_customer_id,
            stripe_account=self.revenue_program.stripe_account_id,
            metadata=metadata,
        )
        self.contribution.refresh_from_db()
        self.assertEqual(self.contribution.provider_setup_intent_id, return_value["id"])
        self.assertEqual(subscription, return_value)

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

    def test_stripe_metadata(self):
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


@pytest.fixture
@pytest.mark.django_db
def contribution():
    return ContributionFactory()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "status",
    (
        ContributionStatus.PROCESSING,
        ContributionStatus.PROCESSING,
        ContributionStatus.FLAGGED,
        ContributionStatus.FLAGGED,
    ),
)
def test_contribution_cancel_when_one_time(status, contribution, monkeypatch):
    contribution.status = status
    contribution.interval = ContributionInterval.ONE_TIME
    contribution.save()
    mock_cancel = Mock()

    monkeypatch.setattr("stripe.PaymentIntent.cancel", mock_cancel)

    contribution.cancel()
    contribution.refresh_from_db()
    assert contribution.status == ContributionStatus.CANCELED

    mock_cancel.assert_called_once_with(
        contribution.provider_payment_id,
        stripe_account=contribution.donation_page.revenue_program.stripe_account_id,
    )


@pytest.mark.django_db
@pytest.mark.parametrize(
    "status,interval,has_payment_method_id",
    (
        (ContributionStatus.PROCESSING, ContributionInterval.MONTHLY, True),
        (ContributionStatus.PROCESSING, ContributionInterval.YEARLY, True),
        (ContributionStatus.FLAGGED, ContributionInterval.MONTHLY, True),
        (ContributionStatus.FLAGGED, ContributionInterval.YEARLY, True),
        (ContributionStatus.PROCESSING, ContributionInterval.MONTHLY, False),
        (ContributionStatus.PROCESSING, ContributionInterval.YEARLY, False),
        (ContributionStatus.FLAGGED, ContributionInterval.MONTHLY, False),
        (ContributionStatus.FLAGGED, ContributionInterval.YEARLY, False),
    ),
)
def test_contribution_cancel_when_recurring(status, interval, has_payment_method_id, contribution, monkeypatch):
    contribution.status = status
    contribution.interval = interval
    contribution.provider_payment_method_id = "something" if has_payment_method_id else None
    with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
        contribution.save()

    mock_delete_sub = Mock()
    monkeypatch.setattr("stripe.Subscription.delete", mock_delete_sub)

    mock_pm_detach = Mock()

    class MockPaymentMethod:
        def __init__(self, *args, **kwargs):
            self.detach = mock_pm_detach

    mock_retrieve_pm = Mock(return_value=MockPaymentMethod())
    monkeypatch.setattr("stripe.PaymentMethod.retrieve", mock_retrieve_pm)

    contribution.cancel()
    contribution.refresh_from_db()
    assert contribution.status == ContributionStatus.CANCELED

    if status == ContributionStatus.PROCESSING:
        mock_delete_sub.assert_called_once_with(
            contribution.provider_subscription_id,
            stripe_account=contribution.donation_page.revenue_program.stripe_account_id,
        )
    elif has_payment_method_id:
        mock_retrieve_pm.assert_called_once_with(
            contribution.provider_payment_method_id,
            stripe_account=contribution.donation_page.revenue_program.stripe_account_id,
        )
        mock_pm_detach.assert_called_once()
    else:
        mock_pm_detach.assert_not_called()


@pytest.mark.django_db()
def test_contribution_cancel_when_unpermitted_interval(contribution, monkeypatch):
    contribution.status = ContributionStatus.PROCESSING
    contribution.interval = "foobar"
    contribution.save()
    last_modified = contribution.modified
    mock_stripe_method = Mock()
    monkeypatch.setattr("stripe.PaymentIntent.cancel", mock_stripe_method)
    monkeypatch.setattr("stripe.Subscription.delete", mock_stripe_method)
    monkeypatch.setattr("stripe.PaymentMethod.retrieve", mock_stripe_method)
    monkeypatch.setattr("stripe.PaymentMethod.detach", mock_stripe_method)

    with pytest.raises(ContributionIntervalError):
        contribution.cancel()
    assert contribution.modified == last_modified
    mock_stripe_method.assert_not_called()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "status",
    (
        ContributionStatus.CANCELED,
        ContributionStatus.FAILED,
        ContributionStatus.PAID,
        ContributionStatus.REFUNDED,
        ContributionStatus.REJECTED,
        "unexpected",
    ),
)
def test_contribution_cancel_when_unpermitted_status(status, contribution, monkeypatch):
    contribution.status = status
    contribution.save()
    last_modified = contribution.modified
    mock_stripe_method = Mock()
    monkeypatch.setattr("stripe.PaymentIntent.cancel", mock_stripe_method)
    monkeypatch.setattr("stripe.Subscription.delete", mock_stripe_method)
    monkeypatch.setattr("stripe.PaymentMethod.retrieve", mock_stripe_method)
    monkeypatch.setattr("stripe.PaymentMethod.detach", mock_stripe_method)

    with pytest.raises(ContributionStatusError):
        contribution.cancel()
    assert contribution.modified == last_modified
    mock_stripe_method.assert_not_called()
