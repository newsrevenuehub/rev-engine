import datetime
from unittest.mock import patch

from django.conf import settings
from django.test import TestCase, override_settings
from django.utils import timezone

import pytest

from apps.contributions.models import Contribution, ContributionStatus, Contributor
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

    @patch("apps.contributions.models.Contribution.send_slack_notifications")
    def test_save_without_slack_arg_only_saves(self, mock_send_slack, mock_fetch_stripe_payment_method):
        self.contribution.amount = 10
        self.contribution.save()
        mock_send_slack.assert_not_called()

    @patch("apps.contributions.models.SlackManager")
    def test_save_with_slack_arg_sends_slack_notifications(self, mock_send_slack, mock_fetch_stripe_payment_method):
        self.contribution.amount = 10
        self.contribution.save(slack_notification=SlackNotificationTypes.SUCCESS)
        mock_send_slack.assert_any_call()

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
        and contribution.billing_details
        == contribution.payment_provider_data["data"]["object"]["charges"]["data"][0]["billing_details"]
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
        and contribution.formatted_donor_selected_amount == f"{contribution.amount} {contribution.currency.upper()}"
    )
