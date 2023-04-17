from unittest.mock import Mock, patch

from django.test import override_settings

import pytest
from addict import Dict as AttrDict
from faker import Faker
from stripe import error as stripe_errors
from stripe.stripe_object import StripeObject

from apps.common.tests.test_resources import AbstractTestCase
from apps.contributions.models import Contribution, ContributionInterval, ContributionStatus
from apps.contributions.payment_managers import PaymentProviderError, StripePaymentManager
from apps.contributions.tests.factories import ContributionFactory


faker = Faker()


class MockInvalidRequestError(stripe_errors.InvalidRequestError):
    _message = "mock invalid request error"
    request_id = "123"

    def __init__(self, *args, **kwargs):
        pass


test_stripe_customer_id = "test_stripe_customer_id"


class MockStripeCustomer(StripeObject):
    id = test_stripe_customer_id

    def __init__(self, *args, **kwargs):
        pass


fake_api_key = "TEST_stripe_secret_key"


class StripePaymentManagerAbstractTestCase(AbstractTestCase):
    def setUp(self):
        super().setUp()
        self.set_up_domain_model()
        self.page = self.org1_rp1.donationpage_set.first()
        self.amount = "10.99"
        self.data = {
            "email": self.contributor_user.email,
            "first_name": "Test",
            "last_name": "Tester",
            "phone": "123-456-7890",
            "mailing_postal_code": 12345,
            "mailing_street": "123 Fake Street",
            "mailing_complement": "Ap 1",
            "mailing_city": "Fakerton",
            "mailing_state": "FK",
            "mailing_country": "Fakeland",
            "amount": self.amount,
            "donor_selected_amount": self.amount,
            "reason": "Testing",
            "revenue_program_slug": self.org1_rp1.slug,
            "statement_descriptor_suffix": None,
            "payment_method_id": "test_payment_method_id",
            "donation_page_slug": self.page.slug,
            "currency": "usd",
            "revenue_program_country": "us",
            "ip": faker.ipv4(),
            "referer": faker.url(),
            "page_id": self.page.pk,
        }
        # TODO: DEV-3026
        self.contribution = ContributionFactory(
            donation_page=self.page, contributor=self.contributor_user, provider_payment_method_id=None
        )
        self.contribution = Contribution.objects.filter(donation_page__revenue_program=self.org1_rp1).first()

    def _instantiate_payment_manager_with_instance(self, contribution=None):
        spm = StripePaymentManager(contribution=contribution if contribution else self.contribution)
        spm.data = self.data
        return spm

    class Meta:
        abstract = True


@override_settings(STRIPE_TEST_SECRET_KEY=fake_api_key)
class StripeOneTimePaymentManagerTest(StripePaymentManagerAbstractTestCase):
    def setUp(self):
        super().setUp()
        self.contribution.interval = ContributionInterval.ONE_TIME
        self.contribution.save()
        self.data.update({"interval": ContributionInterval.ONE_TIME})

    @patch("stripe.PaymentIntent.cancel")
    @patch("stripe.PaymentIntent.capture")
    def test_complete_one_time_payment_reject(self, mock_pi_capture, mock_pi_cancel):
        pm = self._instantiate_payment_manager_with_instance(contribution=self.contribution)
        pm.complete_payment(reject=True)
        mock_pi_capture.assert_not_called()
        mock_pi_cancel.assert_called_once_with(
            self.contribution.provider_payment_id,
            stripe_account=self.contribution.donation_page.revenue_program.payment_provider.stripe_account_id,
            cancellation_reason="fraudulent",
        )

    @patch("stripe.PaymentIntent.cancel")
    @patch("stripe.PaymentIntent.capture")
    def test_complete_one_time_payment_accept(self, mock_pi_capture, mock_pi_cancel):
        pm = self._instantiate_payment_manager_with_instance(contribution=self.contribution)
        pm.complete_payment(reject=False)
        mock_pi_cancel.assert_not_called()
        mock_pi_capture.assert_called_once_with(
            self.contribution.provider_payment_id,
            stripe_account=self.contribution.donation_page.revenue_program.payment_provider.stripe_account_id,
        )

    @patch("stripe.PaymentIntent.capture", side_effect=MockInvalidRequestError)
    def test_complete_payment_invalid_request(self, *args):
        pm = self._instantiate_payment_manager_with_instance(contribution=self.contribution)
        prev_status = pm.contribution.status
        self.assertRaises(PaymentProviderError, pm.complete_payment)
        self.assertEqual(prev_status, pm.contribution.status)

    @patch("stripe.PaymentIntent.capture", side_effect=stripe_errors.StripeError)
    def test_complete_payment_stripe_error(self, *args):
        prev_status = ContributionStatus.PAID
        self.contribution.status = prev_status
        self.contribution.save()
        pm = self._instantiate_payment_manager_with_instance(contribution=self.contribution)
        self.assertRaises(PaymentProviderError, pm.complete_payment)
        self.assertEqual(prev_status, pm.contribution.status)

    def test_invalid_instantiation(self):
        with self.assertRaises(ValueError) as e1:
            StripePaymentManager(contribution="String")

        with self.assertRaises(ValueError) as e2:
            StripePaymentManager(contribution=self.contribution, data=self.data)

        self.assertEqual(
            str(e1.exception), "PaymentManager contribution argument expected an instance of Contribution."
        )
        self.assertEqual(
            str(e2.exception), "PaymentManager must be initialized with either data or a contribution, not both."
        )


test_stripe_subscription = "test_stripe_subscription"


class MockStripeSubscription(StripeObject):
    id = test_stripe_subscription

    def __init__(self, *args, **kwargs):
        pass


@override_settings(STRIPE_TEST_SECRET_KEY=fake_api_key)
class StripeRecurringPaymentManagerTest(StripePaymentManagerAbstractTestCase):
    def setUp(self):
        super().setUp()
        self.contribution.interval = ContributionInterval.MONTHLY
        self.contribution.save()

        test_stripe_product_id = "test_stripe_product_id"
        self.payment_provider1.stripe_product_id = test_stripe_product_id
        self.payment_provider1.save()

        self.payment_method_id = "test_payment_method_id"
        self.data.update({"payment_method_id": self.payment_method_id, "interval": ContributionInterval.MONTHLY})

    @patch("stripe.PaymentMethod.retrieve")
    @patch("stripe.SetupIntent.retrieve")
    def test_reject_happy_path(self, mock_si_retrieve, mock_pm_retrieve, *args):
        mock_si = AttrDict({"payment_method": "some-pm-id"})
        mock_si_retrieve.return_value = mock_si

        mock_pm_detach = Mock()

        class MockPaymentMethod:
            def __init__(self, *args, **kwargs):
                self.detach = mock_pm_detach

        mock_pm_retrieve.side_effect = lambda *args, **kwargs: MockPaymentMethod()
        pm = self._instantiate_payment_manager_with_instance()
        pm.complete_payment(reject=True)
        mock_pm_retrieve.assert_called_once_with(
            mock_si["payment_method"],
            stripe_account=self.contribution.donation_page.revenue_program.payment_provider.stripe_account_id,
        )
        mock_pm_detach.assert_called_once()
        self.assertEqual(self.contribution.status, ContributionStatus.REJECTED)

    @patch("stripe.SetupIntent.cancel", side_effect=stripe_errors.StripeError)
    def test_reject_when_error_canceling_setup_intent(self, mock_sub_delete, *args):
        self.contribution.status = ContributionStatus.FLAGGED
        self.contribution.save()
        pm = self._instantiate_payment_manager_with_instance()
        with pytest.raises(PaymentProviderError):
            pm.complete_payment(reject=True)
        self.assertEqual(self.contribution.status, ContributionStatus.FLAGGED)

    @patch("stripe.SetupIntent.retrieve", return_value={"metadata": {"foo": "bar"}, "payment_method": "some-card"})
    @patch(
        "stripe.Subscription.create",
        return_value={"id": "subscription-id", "latest_invoice": {"payment_intent": {"id": "pi_fakefake"}}},
    )
    def test_accept(self, mock_sub_create, mock_setup_intent_retrieve, *args):
        self.contribution.provider_customer_id = "some-customer"
        self.contribution.provider_setup_intent_id = "some-id"
        self.contribution.save()
        pm = self._instantiate_payment_manager_with_instance()
        pm.complete_payment(reject=False)
        mock_setup_intent_retrieve.assert_called_once_with(
            self.contribution.provider_setup_intent_id,
            stripe_account=self.contribution.donation_page.revenue_program.payment_provider.stripe_account_id,
        )
        mock_sub_create.assert_called_once_with(
            customer=self.contribution.provider_customer_id,
            default_payment_method=mock_setup_intent_retrieve.return_value["payment_method"],
            off_session=True,
            payment_behavior="error_if_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
            items=[
                {
                    "price_data": {
                        "unit_amount": self.contribution.amount,
                        "currency": self.contribution.currency,
                        "product": self.contribution.donation_page.revenue_program.payment_provider.stripe_product_id,
                        "recurring": {"interval": self.contribution.interval.value},
                    }
                }
            ],
            stripe_account=self.contribution.donation_page.revenue_program.payment_provider.stripe_account_id,
            metadata=mock_setup_intent_retrieve.return_value["metadata"],
        )
        self.assertEqual(self.contribution.status, ContributionStatus.PAID)

    @patch("stripe.SetupIntent.retrieve", return_value={"metadata": {"foo": "bar"}, "payment_method": "some-card"})
    @patch("stripe.Subscription.create", side_effect=stripe_errors.StripeError)
    def test_accept_when_stripe_error_on_subscription_create(
        self, mock_setup_intent_retrieve, mock_subscription_create, *args
    ):
        self.contribution.status = ContributionStatus.FLAGGED
        self.contribution.save()
        pm = self._instantiate_payment_manager_with_instance()
        with self.assertRaises(PaymentProviderError) as e:
            pm.complete_payment(reject=False)
        assert self.contribution.status == ContributionStatus.FLAGGED
        mock_setup_intent_retrieve.assert_called_once()
        mock_subscription_create.assert_called_once()
        self.assertEqual(str(e.exception), "Could not complete payment")
