from unittest.mock import patch

from django.conf import settings
from django.test import override_settings

import responses
from faker import Faker
from rest_framework.exceptions import ValidationError
from rest_framework.test import APITestCase
from stripe import error as stripe_errors
from stripe.stripe_object import StripeObject

from apps.contributions.bad_actor import BadActorAPIError, make_bad_actor_request
from apps.contributions.models import Contribution
from apps.contributions.payment_intent import PaymentProviderError, StripePaymentIntent
from apps.contributions.serializers import StripePaymentIntentSerializer
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.organizations.tests.factories import OrganizationFactory
from apps.pages.tests.factories import DonationPageFactory


faker = Faker()


class MockPaymentIntent(StripeObject):
    def __init__(self, *args, **kwargs):
        self.id = "test"
        self.client_secret = "secret123"


class MockInvalidRequestError(stripe_errors.InvalidRequestError):
    def __init__(self, *args, **kwargs):
        pass


fake_api_key = "TEST_stripe_secret_key"


@override_settings(STRIPE_TEST_SECRET_KEY=fake_api_key)
class StripePaymentIntentTest(APITestCase):
    def setUp(self):
        self.organization = OrganizationFactory()
        self.page = DonationPageFactory()
        self.contributor = ContributorFactory()
        self.amount = 1099
        self.data = {
            "email": self.contributor.email,
            "given_name": "Test",
            "family_name": "Tester",
            "amount": self.amount,
            "reason": "Testing",
            "organization_slug": self.organization.slug,
            "donation_page_slug": self.page.slug,
            "payment_type": StripePaymentIntentSerializer.PAYMENT_TYPE_SINGLE[0],
            "ip": faker.ipv4(),
            "referer": faker.url(),
        }
        self.contribution = ContributionFactory()
        self.contribution.organization = self.organization
        self.contribution.save()

    def _instantiate_pi_with_data(self, data=None):
        return StripePaymentIntent(data=data if data else self.data)

    def _instantiate_pi_with_instance(self, contribution=None):
        return StripePaymentIntent(contribution=contribution if contribution else self.contribution)

    def _create_mock_ba_response(self, target_score=None, status_code=200):
        json_body = {"overall_judgment": target_score} if target_score else {"error": "Test error message"}
        responses.add(responses.POST, settings.BAD_ACTOR_API_URL, json=json_body, status=status_code)

    def test_validate_pass(self):
        pi = self._instantiate_pi_with_data()
        self.assertIsNone(pi.validate())

    def test_validate_fail(self):
        bad_data = self.data.copy()
        bad_data.pop("referer")
        pi = self._instantiate_pi_with_data(data=bad_data)
        with self.assertRaises(ValidationError) as v_error:
            pi.validate()
        self.assertIn("referer", v_error.exception.detail)
        self.assertEqual(str(v_error.exception.detail["referer"][0]), "This field is required.")

    def test_calling_badactor_before_validate_throws_error(self):
        pi = self._instantiate_pi_with_data()
        with self.assertRaises(ValueError) as e:
            pi.get_bad_actor_score()
        self.assertEqual(str(e.exception), "PaymentIntent must call 'validate' before calling BadActor API")

    @responses.activate
    def test_get_bad_actor_score_not_flagged(self):
        target_score = 2
        self._create_mock_ba_response(target_score=target_score)
        pi = self._instantiate_pi_with_data()
        self.assertIsNone(pi.validate())
        pi.get_bad_actor_score()
        self.assertEqual(len(responses.calls), 1)
        self.assertEqual(pi.bad_actor_score, target_score)
        self.assertEqual(pi.bad_actor_response, responses.calls[0].response.json())

    @responses.activate
    def test_get_bad_actor_score_flagged(self):
        target_score = 4
        self._create_mock_ba_response(target_score=target_score)
        pi = self._instantiate_pi_with_data()
        self.assertIsNone(pi.validate())
        pi.get_bad_actor_score()
        self.assertEqual(len(responses.calls), 1)
        self.assertEqual(pi.bad_actor_score, target_score)
        self.assertEqual(pi.bad_actor_response, responses.calls[0].response.json())
        self.assertTrue(pi.flagged)
        self.assertIsNotNone(pi.flagged_date)

    @responses.activate
    def test_get_bad_actor_score_error(self):
        self._create_mock_ba_response(status_code=500)
        pi = self._instantiate_pi_with_data()
        self.assertIsNone(pi.validate())
        pi.get_bad_actor_score()
        self.assertFalse(pi.flagged)

    def test_create_payment_intent_when_get_bad_actor_score_not_called(self):
        pi = self._instantiate_pi_with_data()
        with self.assertRaises(ValueError) as e:
            pi.create_payment_intent()
        self.assertEqual(
            str(e.exception), "PaymentIntent must call 'get_bad_actor_score' before creating payment intent"
        )

    @responses.activate
    @patch("stripe.PaymentIntent.create", side_effect=MockPaymentIntent)
    def test_create_payment_intent_when_single_flagged_contribution(self, mock_stripe_create_pi):
        data = self.data
        data["payment_type"] = StripePaymentIntentSerializer.PAYMENT_TYPE_SINGLE[0]
        pi = self._instantiate_pi_with_data(data=data)
        pi.validate()
        self._create_mock_ba_response(target_score=4)
        pi.get_bad_actor_score()

        # Assert that this contribution is not there yet
        self.assertFalse(Contribution.objects.filter(amount=1099).exists()

        pi.create_payment_intent()
        # Importantly, capture method should be "manual" here, for flagged contributions
        mock_stripe_create_pi.assert_called_once_with(
            amount=self.amount,
            currency="usd",
            payment_method_types=["card"],
            api_key=fake_api_key,
            stripe_account=self.organization.stripe_account_id,
            capture_method="manual",
        )
        # New contribution is created...
        new_contribution = Contribution.objects.filter(amount=1099).first()
        self.assertIsNotNone(new_contribution)
        # ...with payment_state "flagged"
        self.assertEqual(new_contribution.payment_state, Contribution.FLAGGED[0])

    @responses.activate
    @patch("stripe.PaymentIntent.create", side_effect=MockPaymentIntent)
    def test_create_payment_intent_single_not_flagged(self, mock_stripe_create_pi):
        data = self.data
        data["payment_type"] = StripePaymentIntentSerializer.PAYMENT_TYPE_SINGLE[0]
        pi = self._instantiate_pi_with_data(data=data)
        pi.validate()
        self._create_mock_ba_response(target_score=2)
        pi.get_bad_actor_score()

        # Assert that this contribution is not there yet
        new_contribution = Contribution.objects.filter(amount=1099).first()
        self.assertIsNone(new_contribution)

        pi.create_payment_intent()
        # Importantly, capture method should be "automatic" here, for non-flagged contributions
        mock_stripe_create_pi.assert_called_once_with(
            amount=self.amount,
            currency="usd",
            payment_method_types=["card"],
            api_key=fake_api_key,
            stripe_account=self.organization.stripe_account_id,
            capture_method="automatic",
        )
        # New contribution is created...
        new_contribution = Contribution.objects.filter(amount=1099).first()
        self.assertIsNotNone(new_contribution)
        # ...with payment_state "processing"
        self.assertEqual(new_contribution.payment_state, Contribution.PROCESSING[0])

    @responses.activate
    def test_create_payment_intent_recurring_flagged(self):
        data = self.data
        data["payment_type"] = StripePaymentIntentSerializer.PAYMENT_TYPE_RECURRING[0]
        pi = self._instantiate_pi_with_data(data=data)
        pi.validate()
        self._create_mock_ba_response(target_score=4)
        pi.get_bad_actor_score()
        # Recurring payments not yet implemented. Maybe these stubs are useful?
        pass

    @responses.activate
    def test_create_payment_intent_recurring_not_flagged(self):
        data = self.data
        data["payment_type"] = StripePaymentIntentSerializer.PAYMENT_TYPE_RECURRING[0]
        pi = self._instantiate_pi_with_data(data=data)
        pi.validate()
        self._create_mock_ba_response(target_score=2)
        pi.get_bad_actor_score()
        # Recurring payments not yet implemented. Maybe these stubs are useful?
        pass

    @patch("stripe.PaymentIntent.cancel")
    @patch("stripe.PaymentIntent.capture")
    def test_complete_payment_reject(self, mock_pi_capture, mock_pi_cancel):
        pi = self._instantiate_pi_with_instance(contribution=self.contribution)
        pi.complete_payment(reject=True)
        mock_pi_capture.assert_not_called()
        mock_pi_cancel.assert_called_once_with(
            "",
            stripe_account=self.organization.stripe_account_id,
            api_key=fake_api_key,
            cancellation_reason="fraudulent",
        )

    @patch("stripe.PaymentIntent.cancel")
    @patch("stripe.PaymentIntent.capture")
    def test_complete_payment_accept(self, mock_pi_capture, mock_pi_cancel):
        pi = self._instantiate_pi_with_instance(contribution=self.contribution)
        pi.complete_payment(reject=False)
        mock_pi_cancel.assert_not_called()
        mock_pi_capture.assert_called_once_with(
            "",
            stripe_account=self.organization.stripe_account_id,
            api_key=fake_api_key,
        )

    @patch("stripe.PaymentIntent.capture", side_effect=MockInvalidRequestError)
    def test_complete_payment_invalid_request(self, mock_stripe_capture):
        pi = self._instantiate_pi_with_instance(contribution=self.contribution)
        prev_payment_state = pi.contribution.payment_state
        self.assertRaises(PaymentProviderError, pi.complete_payment)
        self.assertEqual(prev_payment_state, pi.contribution.payment_state)

    @patch("stripe.PaymentIntent.capture", side_effect=stripe_errors.StripeError)
    def test_complete_payment_stripe_error(self, mock_stripe_capture):
        pi = self._instantiate_pi_with_instance(contribution=self.contribution)
        prev_payment_state = pi.contribution.payment_state
        self.assertRaises(PaymentProviderError, pi.complete_payment)
        self.assertEqual(prev_payment_state, pi.contribution.payment_state)

    def test_invalid_instantiation(self):
        with self.assertRaises(ValueError) as e1:
            StripePaymentIntent(contribution="String")

        with self.assertRaises(ValueError) as e2:
            StripePaymentIntent(contribution=self.contribution, data=self.data)

        self.assertEqual(str(e1.exception), "PaymentIntent contribution argument expected an instance of Contribution.")
        self.assertEqual(
            str(e2.exception), "PaymentIntent must be initialized with either data or a contribution, not both."
        )

    def test_objects_do_not_exist(self):
        with self.assertRaises(ValueError) as e1:
            data = self.data
            data["organization_slug"] = "doesnt-exist"
            pi = StripePaymentIntent(data=data)
            pi.validate()
            pi.get_organization()

        with self.assertRaises(ValueError) as e2:
            data = self.data
            data["donation_page_slug"] = "doesnt-exist"
            pi = StripePaymentIntent(data=data)
            pi.validate()
            pi.get_donation_page()

        self.assertEqual(str(e1.exception), "PaymentIntent could not find an organization with slug provided")
        self.assertEqual(str(e2.exception), "PaymentIntent could not find a donation page with slug provided")

    @override_settings(BAD_ACTOR_API_KEY=None)
    def test_bad_actor_throws_error_missing_settings(self):
        self.assertRaises(BadActorAPIError, make_bad_actor_request, {})
