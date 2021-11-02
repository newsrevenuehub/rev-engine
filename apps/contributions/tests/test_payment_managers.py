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
from apps.contributions.models import Contribution, ContributionInterval, ContributionStatus
from apps.contributions.payment_managers import (
    PaymentBadParamsError,
    PaymentProviderError,
    StripePaymentManager,
)
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory


faker = Faker()


class MockPaymentIntent(StripeObject):
    def __init__(self, *args, **kwargs):
        self.id = "test"
        self.client_secret = "secret123"


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


class StripePaymentManagerAbstractTestCase(APITestCase):
    def setUp(self):
        self.organization = OrganizationFactory()
        self.revenue_program = RevenueProgramFactory(organization=self.organization)
        self.page = DonationPageFactory(revenue_program=self.revenue_program)
        self.contributor = ContributorFactory()
        self.amount = "10.99"
        self.data = {
            "email": self.contributor.email,
            "first_name": "Test",
            "last_name": "Tester",
            "mailing_postal_code": 12345,
            "mailing_street": "123 Fake Street",
            "mailing_city": "Fakerton",
            "mailing_state": "FK",
            "mailing_country": "Fakeland",
            "amount": self.amount,
            "donor_selected_amount": self.amount,
            "reason": "Testing",
            "revenue_program_slug": self.revenue_program.slug,
            "statement_descriptor_suffix": None,
            "payment_method_id": "test_payment_method_id",
            "donation_page_slug": self.page.slug,
            "currency": "usd",
            "organization_country": "us",
            "ip": faker.ipv4(),
            "referer": faker.url(),
            "page_id": self.page.pk,
        }
        self.contribution = ContributionFactory(
            donation_page=self.page, contributor=self.contributor, organization=self.organization
        )

    def _create_mock_ba_response(self, target_score=None, status_code=200):
        json_body = {"overall_judgment": target_score} if target_score else {"error": "Test error message"}
        responses.add(responses.POST, settings.BAD_ACTOR_API_URL, json=json_body, status=status_code)

    def _instantiate_payment_manager_with_data(self, data=None):
        return StripePaymentManager(data=data if data else self.data)

    def _instantiate_payment_manager_with_instance(self, contribution=None):
        spm = StripePaymentManager(contribution=contribution if contribution else self.contribution)
        spm.data = self.data
        return spm


@override_settings(STRIPE_TEST_SECRET_KEY=fake_api_key)
class StripeOneTimePaymentManagerTest(StripePaymentManagerAbstractTestCase):
    def setUp(self):
        super().setUp()
        self.contribution.interval = ContributionInterval.ONE_TIME
        self.contribution.save()

        self.data.update({"interval": ContributionInterval.ONE_TIME})

    def test_validate_pass(self):
        pm = self._instantiate_payment_manager_with_data()
        self.assertIsNone(pm.validate())

    def test_validate_fail(self):
        bad_data = self.data.copy()
        bad_data.pop("referer")
        pm = self._instantiate_payment_manager_with_data(data=bad_data)
        with self.assertRaises(ValidationError) as v_error:
            pm.validate()
        self.assertIn("referer", v_error.exception.detail)
        self.assertEqual(str(v_error.exception.detail["referer"][0]), "This field is required.")

    @patch("stripe.Subscription.delete")
    def test_ensure_contribution(self, mock_delete_sub):
        pm = StripePaymentManager(data={"interval": "test"})
        with self.assertRaises(ValueError) as error:
            pm.cancel_recurring_payment()
        self.assertEqual(
            str(error.exception), "Method requires PaymentManager to be instantiated with contribution instance"
        )
        mock_delete_sub.assert_not_called()

    def test_calling_badactor_before_validate_throws_error(self):
        pm = self._instantiate_payment_manager_with_data()
        with self.assertRaises(ValueError) as e:
            pm.get_bad_actor_score()
        self.assertEqual(str(e.exception), "PaymentManager must call 'validate' before performing this action")

    @responses.activate
    def test_get_bad_actor_score_not_flagged(self):
        target_score = 2
        self._create_mock_ba_response(target_score=target_score)
        pm = self._instantiate_payment_manager_with_data()
        self.assertIsNone(pm.validate())
        pm.get_bad_actor_score()
        self.assertEqual(len(responses.calls), 1)
        self.assertEqual(pm.bad_actor_score, target_score)
        self.assertEqual(pm.bad_actor_response, responses.calls[0].response.json())

    @responses.activate
    def test_get_bad_actor_score_flagged(self):
        target_score = 4
        self._create_mock_ba_response(target_score=target_score)
        pm = self._instantiate_payment_manager_with_data()
        self.assertIsNone(pm.validate())
        pm.get_bad_actor_score()
        self.assertEqual(len(responses.calls), 1)
        self.assertEqual(pm.bad_actor_score, target_score)
        self.assertEqual(pm.bad_actor_response, responses.calls[0].response.json())
        self.assertTrue(pm.flagged)
        self.assertIsNotNone(pm.flagged_date)

    @responses.activate
    def test_get_bad_actor_score_error(self):
        self._create_mock_ba_response(status_code=500)
        pm = self._instantiate_payment_manager_with_data()
        self.assertIsNone(pm.validate())
        pm.get_bad_actor_score()
        self.assertFalse(pm.flagged)

    def test_create_one_time_payment_when_get_bad_actor_score_not_called(self):
        pm = self._instantiate_payment_manager_with_data()
        pm.validate()
        with self.assertRaises(ValueError) as e:
            pm.create_one_time_payment()
        self.assertEqual(
            str(e.exception), "PaymentManager must call 'get_bad_actor_score' before performing this action"
        )

    @responses.activate
    @patch("stripe.Customer.create", side_effect=MockStripeCustomer)
    @patch("stripe.PaymentIntent.create", side_effect=MockPaymentIntent)
    def test_create_payment_intent_when_single_flagged_contribution(self, mock_stripe_create_pi, *args):
        data = self.data
        data["interval"] = ContributionInterval.ONE_TIME
        pm = self._instantiate_payment_manager_with_data(data=data)
        pm.validate()
        self._create_mock_ba_response(target_score=4)
        pm.get_bad_actor_score()

        # Assert that this contribution is not there yet
        self.assertFalse(Contribution.objects.filter(amount=1099).exists())

        pm.create_one_time_payment()
        # Importantly, capture method should be "manual" here, for flagged contributions
        mock_stripe_create_pi.assert_called_once_with(
            amount=1099,
            currency="usd",
            customer=MockStripeCustomer.id,
            payment_method_types=["card"],
            api_key=fake_api_key,
            stripe_account=self.organization.stripe_account_id,
            capture_method="manual",
            receipt_email=data["email"],
            statement_descriptor_suffix=self.revenue_program.stripe_statement_descriptor_suffix,
            metadata=pm.bundle_metadata("PAYMENT"),
        )
        # New contribution is created...
        new_contribution = Contribution.objects.filter(amount=1099).first()
        self.assertIsNotNone(new_contribution)
        # ...with status "flagged"
        self.assertEqual(new_contribution.status, ContributionStatus.FLAGGED)
        # ...with flagged_date set
        self.assertIsNotNone(new_contribution.flagged_date)

    @responses.activate
    @patch("stripe.Customer.create", side_effect=MockStripeCustomer)
    @patch("stripe.PaymentIntent.create", side_effect=MockPaymentIntent)
    def test_create_payment_intent_single_not_flagged(self, mock_stripe_create_pi, *args):
        data = self.data
        data["interval"] = ContributionInterval.ONE_TIME
        pm = self._instantiate_payment_manager_with_data(data=data)
        pm.validate()
        self._create_mock_ba_response(target_score=2)
        pm.get_bad_actor_score()

        # Assert that this contribution is not there yet
        new_contribution = Contribution.objects.filter(amount=1099).first()
        self.assertIsNone(new_contribution)

        pm.create_one_time_payment()
        # Importantly, capture method should be "automatic" here, for non-flagged contributions
        mock_stripe_create_pi.assert_called_once_with(
            amount=1099,
            currency="usd",
            customer=MockStripeCustomer.id,
            payment_method_types=["card"],
            api_key=fake_api_key,
            stripe_account=self.organization.stripe_account_id,
            capture_method="automatic",
            receipt_email=data["email"],
            statement_descriptor_suffix=self.revenue_program.stripe_statement_descriptor_suffix,
            metadata=pm.bundle_metadata("PAYMENT"),
        )
        # New contribution is created...
        new_contribution = Contribution.objects.filter(amount=1099).first()
        self.assertIsNotNone(new_contribution)
        # ...with status "processing"
        self.assertEqual(new_contribution.status, ContributionStatus.PROCESSING)

    @patch("stripe.PaymentIntent.cancel")
    @patch("stripe.PaymentIntent.capture")
    def test_complete_one_time_payment_reject(self, mock_pi_capture, mock_pi_cancel):
        pm = self._instantiate_payment_manager_with_instance(contribution=self.contribution)
        pm.complete_payment(reject=True)
        mock_pi_capture.assert_not_called()
        mock_pi_cancel.assert_called_once_with(
            None,
            stripe_account=self.organization.stripe_account_id,
            api_key=fake_api_key,
            cancellation_reason="fraudulent",
        )

    @patch("stripe.PaymentIntent.cancel")
    @patch("stripe.PaymentIntent.capture")
    def test_complete_one_time_payment_accept(self, mock_pi_capture, mock_pi_cancel):
        pm = self._instantiate_payment_manager_with_instance(contribution=self.contribution)
        pm.complete_payment(reject=False)
        mock_pi_cancel.assert_not_called()
        mock_pi_capture.assert_called_once_with(
            None,
            stripe_account=self.organization.stripe_account_id,
            api_key=fake_api_key,
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

    def test_objects_do_not_exist(self):
        with self.assertRaises(PaymentBadParamsError) as e1:
            data = self.data
            data["revenue_program_slug"] = "doesnt-exist"
            pm = StripePaymentManager(data=data)
            pm.validate()
            pm.get_organization()

        with self.assertRaises(PaymentBadParamsError) as e2:
            data = self.data
            data["donation_page_slug"] = "doesnt-exist"
            pm = StripePaymentManager(data=data)
            pm.validate()
            pm.get_donation_page()

        self.assertEqual(str(e1.exception), "PaymentManager could not find a revenue program with slug provided")
        self.assertEqual(str(e2.exception), "PaymentManager could not find a donation page with slug provided")

    @override_settings(BAD_ACTOR_API_KEY=None)
    def test_bad_actor_throws_error_missing_settings(self):
        self.assertRaises(BadActorAPIError, make_bad_actor_request, {})


test_stripe_subscription = "test_stripe_subscription"


class MockStripeSubscription(StripeObject):
    id = test_stripe_subscription

    def __init__(self, *args, **kwargs):
        pass


@override_settings(STRIPE_TEST_SECRET_KEY=fake_api_key)
@patch("stripe.PaymentMethod.retrieve", side_effect="{}")
class StripeRecurringPaymentManagerTest(StripePaymentManagerAbstractTestCase):
    def setUp(self):
        super().setUp()
        self.contribution.interval = ContributionInterval.MONTHLY
        self.contribution.save()

        test_stripe_product_id = "test_stripe_product_id"
        self.organization.stripe_product_id = test_stripe_product_id
        self.organization.save()

        self.payment_method_id = "test_payment_method_id"
        self.data.update({"payment_method_id": self.payment_method_id, "interval": ContributionInterval.MONTHLY})

    @responses.activate
    def _prepare_valid_subscription(self, flagged=False):
        pm = self._instantiate_payment_manager_with_data()
        pm.validate()
        self._create_mock_ba_response(target_score=4 if flagged else 2)
        pm.get_bad_actor_score()
        return pm

    def test_ensure_validated_data(self, *args):
        pm = self._instantiate_payment_manager_with_data()
        with self.assertRaises(ValueError) as e:
            pm.create_subscription()
        self.assertEqual(str(e.exception), "PaymentManager must call 'validate' before performing this action")

    def test_ensure_bad_actor_score(self, *args):
        pm = self._instantiate_payment_manager_with_data()
        pm.validate()
        with self.assertRaises(ValueError) as e:
            pm.create_subscription()
        self.assertEqual(
            str(e.exception), "PaymentManager must call 'get_bad_actor_score' before performing this action"
        )

    @patch("stripe.PaymentMethod.attach")
    @patch("stripe.Subscription.create", side_effect=MockStripeSubscription)
    @patch("stripe.Customer.create", side_effect=MockStripeCustomer)
    def test_stripe_create_customer_called(self, mock_customer_create, *args):
        pm = self._prepare_valid_subscription(flagged=False)
        pm.create_subscription()
        mock_customer_create.assert_called_once_with(
            email=self.contributor.email,
            api_key=fake_api_key,
            stripe_account=self.organization.stripe_account_id,
            metadata=pm.bundle_metadata("CUSTOMER"),
        )

    @patch("stripe.Customer.create", side_effect=MockStripeCustomer)
    @patch("stripe.Subscription.create", side_effect=MockStripeSubscription)
    @patch("stripe.PaymentMethod.attach")
    def test_stripe_payment_method_attach_called(self, mock_payment_method_attach, *args):
        pm = self._prepare_valid_subscription(flagged=False)
        pm.create_subscription()
        mock_payment_method_attach.assert_called_once_with(
            self.payment_method_id,
            customer=test_stripe_customer_id,
            stripe_account=self.organization.stripe_account_id,
            api_key=fake_api_key,
        )

    @patch("stripe.Customer.create", side_effect=MockStripeCustomer)
    @patch("stripe.PaymentMethod.attach")
    @patch("stripe.Subscription.create", side_effect=MockStripeSubscription)
    def test_stripe_subscription_create_called(self, mock_sub_create, *args):
        pm = self._prepare_valid_subscription(flagged=False)
        pm.create_subscription()
        mock_sub_create.assert_called_once_with(
            customer=test_stripe_customer_id,
            default_payment_method=self.payment_method_id,
            items=[
                {
                    "price_data": {
                        "unit_amount": 1099,
                        "currency": self.contribution.currency,
                        "product": self.organization.stripe_product_id,
                        "recurring": {"interval": self.data["interval"]},
                    }
                }
            ],
            stripe_account=self.organization.stripe_account_id,
            api_key=fake_api_key,
            metadata=pm.bundle_metadata("PAYMENT"),
        )

    @patch("stripe.Customer.create", side_effect=MockStripeCustomer)
    @patch("stripe.PaymentMethod.attach")
    @patch("stripe.Subscription.create", side_effect=MockStripeSubscription)
    def test_flagged_does_not_create_subscription(self, mock_sub_create, *args):
        pm = self._prepare_valid_subscription(flagged=True)
        pm.create_subscription()
        mock_sub_create.assert_not_called()

    @patch("stripe.Customer.create", side_effect=MockStripeCustomer)
    @patch("stripe.PaymentMethod.attach")
    @patch("stripe.Subscription.create", side_effect=MockStripeSubscription)
    def test_reject(self, mock_sub_create, *args):
        pm = self._instantiate_payment_manager_with_instance()
        pm.complete_payment(reject=True)
        mock_sub_create.assert_not_called()
        self.assertEqual(self.contribution.status, ContributionStatus.REJECTED)

    @patch("stripe.Customer.create", side_effect=MockStripeCustomer)
    @patch("stripe.PaymentMethod.attach")
    @patch("stripe.Subscription.create", side_effect=MockStripeSubscription)
    def test_accept(self, mock_sub_create, *args):
        pm = self._instantiate_payment_manager_with_instance()
        pm.complete_payment(reject=False)
        mock_sub_create.assert_called_once_with(
            customer=None,
            default_payment_method=None,
            items=[
                {
                    "price_data": {
                        "unit_amount": self.contribution.amount,
                        "currency": self.contribution.currency,
                        "product": self.organization.stripe_product_id,
                        "recurring": {"interval": self.contribution.interval},
                    }
                }
            ],
            stripe_account=self.organization.stripe_account_id,
            api_key=fake_api_key,
            metadata=None,
        )
        self.assertEqual(self.contribution.status, ContributionStatus.PROCESSING)

    @patch("stripe.Customer.create", side_effect=MockStripeCustomer)
    @patch("stripe.PaymentMethod.attach")
    @patch("stripe.Subscription.create", side_effect=stripe_errors.StripeError)
    def test_stripe_error(self, mock_sub_create, *args):
        pm = self._instantiate_payment_manager_with_instance()
        with self.assertRaises(PaymentProviderError) as e:
            pm.complete_payment(reject=False)
        mock_sub_create.assert_called_once()
        self.assertEqual(str(e.exception), "Could not complete payment")

    def test_get_donation_page_should_work_with_contribution_or_validated_data(self, *args):
        """
        Test against regression on a bug in which ContributionMetadata lookup_map.re_revenue_program_id
        accessed payment_manager.get_donation_page, which expected validated data rather than the instance of
        a Contribution that is available when flagged donations are accepted.
        """
        pm_i = self._instantiate_payment_manager_with_instance()
        donation_page_i = pm_i.get_donation_page()
        self.assertIsNotNone(donation_page_i)

        pm_v = self._instantiate_payment_manager_with_data()
        pm_v.validate()
        donation_page_v = pm_v.get_donation_page()
        self.assertIsNotNone(donation_page_v)

        # It should raise a ValueError if instantiated with data but not validated
        pm_v = self._instantiate_payment_manager_with_data()
        self.assertRaises(ValueError, pm_v.get_donation_page)

    def test_get_donation_page_should_work_with_default_donation_page(self, *args):
        """
        Further strengthen the get_donation_page method by ensuring that it can be called without a page slug.
        """
        # Set default page on rev program
        self.revenue_program.default_donation_page = self.page
        self.revenue_program.save()

        # Remove page_slug from params
        data = self.data
        data["donation_page_slug"] = ""
        pm = self._instantiate_payment_manager_with_data(data=data)
        pm.validate()
        donation_page = pm.get_donation_page()
        self.assertIsNotNone(donation_page)

    def test_get_revenue_program_should_work_without_validated_data(self, *args):
        pm = self._instantiate_payment_manager_with_instance()
        revenue_program = pm.get_revenue_program()
        self.assertIsNotNone(revenue_program)

    # def test_create_one_time_payment_adds_metadata_to_contribution(self):
    # def test_create_subscription_adds_metadata_to_contribution
