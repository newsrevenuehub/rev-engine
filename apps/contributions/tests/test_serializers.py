from unittest.mock import Mock

from django.conf import settings
from django.test import TestCase
from django.utils import timezone

import pytest
import stripe
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIRequestFactory

from apps.api.error_messages import GENERIC_BLANK, GENERIC_UNEXPECTED_VALUE
from apps.contributions import serializers
from apps.contributions.bad_actor import BadActorAPIError
from apps.contributions.models import Contribution, ContributionStatus, Contributor
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.contributions.utils import format_ambiguous_currency
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory


class ContributionSerializer(TestCase):
    expected_fields = [
        "id",
        "contributor_email",
        "created",
        "amount",
        "currency",
        "interval",
        "last_payment_date",
        "bad_actor_score",
        "flagged_date",
        "auto_accepted_on",
        "status",
    ]

    def setUp(self):
        self.serializer = serializers.ContributionSerializer
        self.contributor = ContributorFactory()
        self.contribution = ContributionFactory(
            amount=1000, contributor=self.contributor, payment_provider_used="Stripe"
        )

    def test_returned_fields(self):
        data = self.serializer(self.contribution).data
        for field in self.expected_fields:
            self.assertIn(field, data)

    def test_get_auto_accepted_on(self):
        # Should return null if empty
        self.contribution.flagged_date = None
        self.contribution.save()
        old_data = self.serializer(self.contribution).data
        self.assertIsNone(old_data["auto_accepted_on"])
        # Should return a datetime equal to flagged_date + "FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA" setting
        self.contribution.flagged_date = timezone.now()
        self.contribution.save()
        target_date = self.contribution.flagged_date + settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA
        new_data = self.serializer(self.contribution).data
        self.assertEqual(new_data["auto_accepted_on"], target_date)

    def test_get_formatted_payment_provider_used(self):
        data = self.serializer(self.contribution).data
        self.assertEqual(data["formatted_payment_provider_used"], "Stripe")

    def test_contributor_email(self):
        data = self.serializer(self.contribution).data
        self.assertEqual(data["contributor_email"], self.contributor.email)

    def test_get_provider_payment_url(self):
        my_provider_payment_id = "my_provider_payment_id"
        self.contribution.provider_payment_id = my_provider_payment_id
        self.contribution.save()

        data = self.serializer(self.contribution).data
        self.assertIn(my_provider_payment_id, data["provider_payment_url"])

    def test_get_provider_subscription_url(self):
        my_provider_subscription_id = "my_provider_subscription_id"
        self.contribution.provider_subscription_id = my_provider_subscription_id
        self.contribution.save()

        data = self.serializer(self.contribution).data
        self.assertIn(my_provider_subscription_id, data["provider_subscription_url"])

    def test_get_provider_customer_url(self):
        my_provider_customer_id = "my_provider_customer_id"
        self.contribution.provider_customer_id = my_provider_customer_id
        self.contribution.save()

        data = self.serializer(self.contribution).data
        self.assertIn(my_provider_customer_id, data["provider_customer_url"])


class AbstractPaymentSerializerTest(TestCase):
    def setUp(self):
        self.serializer = serializers.AbstractPaymentSerializer
        self.revenue_program = RevenueProgramFactory()
        self.page = DonationPageFactory(revenue_program=self.revenue_program)
        self.element = {"type": "Testing", "uuid": "testing-123", "requiredFields": [], "content": {}}

        self.payment_data = {
            "amount": 123,
            "currency": "USD",
            "email": "test@test.com",
            "first_name": "test",
            "last_name": "test",
            "ip": "127.0.0.1",
            "mailing_city": "test",
            "mailing_country": "test",
            "mailing_postal_code": "12345",
            "mailing_state": "test",
            "mailing_street": "test",
            "revenue_program_country": "ts",
            "referer": "https://test.test",
            "revenue_program_slug": "test",
            "page_id": self.page.pk,
        }

    def _add_element_to_page(self, element):
        self.page.elements = [element]
        self.page.save()

    def test_amount_validation_min(self):
        self.payment_data["amount"] = serializers.REVENGINE_MIN_AMOUNT - 1
        serializer = self.serializer(data=self.payment_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("amount", serializer.errors)
        expected_msg = f"We can only accept contributions greater than or equal to {format_ambiguous_currency(serializers.REVENGINE_MIN_AMOUNT)}"
        self.assertEqual(str(serializer.errors["amount"][0]), expected_msg)

    def test_amount_validation_max(self):
        self.payment_data["amount"] = serializers.STRIPE_MAX_AMOUNT + 1
        serializer = self.serializer(data=self.payment_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("amount", serializer.errors)
        expected_msg = f"We can only accept contributions less than or equal to {format_ambiguous_currency(serializers.STRIPE_MAX_AMOUNT)}"
        self.assertEqual(str(serializer.errors["amount"][0]), expected_msg)


@pytest.mark.django_db()
@pytest.fixture
def donation_page():
    return DonationPageFactory()


@pytest.mark.django_db()
@pytest.fixture
def donation_page_with_conditionally_required_phone_element():
    page = DonationPageFactory()
    conditionally_required_elements = [
        {
            "type": "DDonorInfo",
            "uuid": "3b5662c6-901b-45dc-952d-1209f3d53859",
            "content": {"askPhone": True},
            "requiredFields": ["phone"],
        }
    ]
    page.elements = conditionally_required_elements
    page.save()
    return page


@pytest.mark.django_db()
@pytest.fixture
def donation_page_with_conditionally_required_reason_for_giving_element_no_presets():
    page = DonationPageFactory()
    conditionally_required_elements = [
        {
            "type": "DReason",
            "uuid": "31f35bc5-2c4e-45e3-9309-62eaac60a621",
            "content": {"reasons": [], "askReason": True, "askHonoree": False, "askInMemoryOf": False},
            "requiredFields": ["reason_for_giving"],
        },
    ]
    page.elements = conditionally_required_elements
    page.save()
    return page


PRESET_REASONS = ["one", "two", "three"]


@pytest.mark.django_db()
@pytest.fixture
def donation_page_with_conditionally_required_reason_for_giving_element_and_presets():
    page = DonationPageFactory()
    conditionally_required_elements = [
        {
            "type": "DReason",
            "uuid": "31f35bc5-2c4e-45e3-9309-62eaac60a621",
            "content": {
                "reasons": PRESET_REASONS,
                "askReason": True,
                "askHonoree": False,
                "askInMemoryOf": False,
            },
            "requiredFields": ["reason_for_giving"],
        },
    ]
    page.elements = conditionally_required_elements
    page.save()
    return page


@pytest.mark.django_db()
@pytest.fixture
def donation_page_with_unrequired_reason_for_giving_element_and_presets():
    page = DonationPageFactory()
    conditionally_required_elements = [
        {
            "type": "DReason",
            "uuid": "31f35bc5-2c4e-45e3-9309-62eaac60a621",
            "content": {
                "reasons": PRESET_REASONS,
                "askReason": True,
                "askHonoree": False,
                "askInMemoryOf": False,
            },
            "requiredFields": [],
        },
    ]
    page.elements = conditionally_required_elements
    page.save()
    return page


@pytest.mark.django_db()
@pytest.fixture
def donation_page_with_ask_honoree():
    page = DonationPageFactory()
    conditionally_included_elements = [
        {
            "type": "DReason",
            "uuid": "31f35bc5-2c4e-45e3-9309-62eaac60a621",
            "content": {
                "reasons": [],
                "askReason": [],
                "askHonoree": True,
                "askInMemoryOf": False,
            },
            "requiredFields": [],
        },
    ]
    page.elements = conditionally_included_elements
    page.save()
    return page


@pytest.mark.django_db()
@pytest.fixture
def donation_page_with_ask_in_memory():
    page = DonationPageFactory()
    conditionally_included_elements = [
        {
            "type": "DReason",
            "uuid": "31f35bc5-2c4e-45e3-9309-62eaac60a621",
            "content": {
                "reasons": [],
                "askReason": [],
                "askHonoree": False,
                "askInMemoryOf": True,
            },
            "requiredFields": [],
        },
    ]
    page.elements = conditionally_included_elements
    page.save()
    return page


def get_donation_page_fixture(
    requested_fixture,
    donation_page=None,
    donation_page_with_conditionally_required_phone_element=None,
    donation_page_with_conditionally_required_reason_for_giving_element_no_presets=None,
    donation_page_with_conditionally_required_reason_for_giving_element_and_presets=None,
    donation_page_with_unrequired_reason_for_giving_element_and_presets=None,
    donation_page_with_ask_honoree=None,
    donation_page_with_ask_in_memory=None,
):
    """Convenience function to accomplish choosing donation page fixture via pytest.mark.parametrize

    Fixtures cannot be directly passed to pytest.mark.parametrize, but in some of our tests,
    it's quite convenient to be able to make page fixture choice parametrizable. Pytest fixtures have to be passed
    as params to a test in order to be in a usuable state at run time.

    This function gets passed a string value referring to a requested fixture, as well as a reference to fixtures passed as test
    call args, allowing us to yield the appropriate test fixture via parametrization.
    """
    return {
        "donation_page": donation_page,
        "donation_page_with_conditionally_required_phone_element": donation_page_with_conditionally_required_phone_element,
        "donation_page_with_conditionally_required_reason_for_giving_element_no_presets": donation_page_with_conditionally_required_reason_for_giving_element_no_presets,
        "donation_page_with_conditionally_required_reason_for_giving_element_and_presets": donation_page_with_conditionally_required_reason_for_giving_element_and_presets,
        "donation_page_with_unrequired_reason_for_giving_element_and_presets": donation_page_with_unrequired_reason_for_giving_element_and_presets,
        "donation_page_with_ask_honoree": donation_page_with_ask_honoree,
        "donation_page_with_ask_in_memory": donation_page_with_ask_in_memory,
    }[requested_fixture]


@pytest.fixture
def minimally_valid_data(donation_page):
    """This fixture represents the fields that must always appear in request data for creating
    a payment. If a page has configured to include elements like phone number, reason for giving, etc.,
    then the request data will contain additional fields."""
    return {
        "amount": 120.1,
        "email": "foo@bar.com",
        "page": donation_page.id,
        "interval": "one_time",
        "first_name": "Foo",
        "last_name": "Bar",
        "mailing_postal_code": "12345",
        "mailing_street": "123 Street St",
        "mailing_city": "Small Town",
        "mailing_state": "OH",
        "mailing_country": "US",
        "agreed_to_pay_fees": True,
        "captcha_token": "12345",
    }


class MockBadActorResponseObjectNotBad:
    """Used in tests below to simulate response returned by make_bad_actor_request

    See https://docs.pytest.org/en/7.1.x/how-to/monkeypatch.html for more info on how/why
    """

    mock_bad_actor_response_json = {"overall_judgment": settings.BAD_ACTOR_FAILURE_THRESHOLD - 1}

    @classmethod
    def json(cls):
        return cls.mock_bad_actor_response_json


class MockBadActorResponseObjectBad:
    """Used in tests below to simulate response returned by make_bad_actor_request

    See https://docs.pytest.org/en/7.1.x/how-to/monkeypatch.html for more info on how/why
    """

    mock_bad_actor_response_json = {"overall_judgment": settings.BAD_ACTOR_FAILURE_THRESHOLD}

    @classmethod
    def json(cls):
        return cls.mock_bad_actor_response_json


def mock_get_bad_actor(*args, **kwargs):
    response = kwargs.get("response", MockBadActorResponseObjectNotBad)
    return response


def mock_get_bad_actor_raise_exception(*args, **kwargs):
    raise BadActorAPIError("Something bad happend")


def mock_stripe_call_with_error(*args, **kwargs):
    raise stripe.error.APIError("Something horrible has happened")


def mock_create_stripe_customer_with_exception(*args, **kwargs):
    raise stripe.error.APIError("Something horrible has happened")


@pytest.mark.django_db
class TestBaseCreatePaymentSerializer:
    serializer_class = serializers.BaseCreatePaymentSerializer

    @pytest.mark.parametrize(
        "input_data,requested_page,expect_valid,error_key,error_msg",
        [
            ({}, "donation_page", True, None, None),
            (
                {},
                "donation_page_with_conditionally_required_reason_for_giving_element_no_presets",
                False,
                "reason_for_giving",
                GENERIC_BLANK,
            ),
            (
                {},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                False,
                "reason_for_giving",
                GENERIC_BLANK,
            ),
            ({}, "donation_page_with_unrequired_reason_for_giving_element_and_presets", True, None, None),
            ({"reason_for_giving": "Other", "reason_other": ""}, "donation_page", False, "reason_other", GENERIC_BLANK),
            (
                {"reason_for_giving": "Other", "reason_other": ""},
                "donation_page_with_conditionally_required_reason_for_giving_element_no_presets",
                False,
                "reason_other",
                GENERIC_BLANK,
            ),
            (
                {"reason_for_giving": "Other", "reason_other": ""},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                False,
                "reason_other",
                GENERIC_BLANK,
            ),
            (
                {"reason_for_giving": "Other", "reason_other": ""},
                "donation_page_with_unrequired_reason_for_giving_element_and_presets",
                False,
                "reason_other",
                GENERIC_BLANK,
            ),
            ({"reason_for_giving": "Other"}, "donation_page", False, "reason_other", GENERIC_BLANK),
            (
                {"reason_for_giving": "Other"},
                "donation_page_with_conditionally_required_reason_for_giving_element_no_presets",
                False,
                "reason_other",
                GENERIC_BLANK,
            ),
            (
                {"reason_for_giving": "Other"},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                False,
                "reason_other",
                GENERIC_BLANK,
            ),
            (
                {"reason_for_giving": "Other"},
                "donation_page_with_unrequired_reason_for_giving_element_and_presets",
                False,
                "reason_other",
                GENERIC_BLANK,
            ),
            ({"reason_for_giving": "Other", "reason_other": "Reason"}, "donation_page", True, None, None),
            (
                {"reason_for_giving": "Other", "reason_other": "Reason"},
                "donation_page_with_conditionally_required_reason_for_giving_element_no_presets",
                True,
                None,
                None,
            ),
            (
                {"reason_for_giving": "Other", "reason_other": "Reason"},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                True,
                None,
                None,
            ),
            (
                {"reason_for_giving": "Other", "reason_other": "Reason"},
                "donation_page_with_unrequired_reason_for_giving_element_and_presets",
                True,
                None,
                None,
            ),
            ({"reason_other": "Reason"}, "donation_page", True, None, None),
            (
                {"reason_other": "Reason"},
                "donation_page_with_conditionally_required_reason_for_giving_element_no_presets",
                True,
                None,
                None,
            ),
            (
                {"reason_other": "Reason"},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                True,
                None,
                None,
            ),
            (
                {"reason_other": "Reason"},
                "donation_page_with_unrequired_reason_for_giving_element_and_presets",
                True,
                None,
                None,
            ),
            ({"reason_for_giving": "My reason"}, "donation_page", False, "reason_for_giving", GENERIC_UNEXPECTED_VALUE),
            (
                {"reason_for_giving": "My reason"},
                "donation_page_with_conditionally_required_reason_for_giving_element_no_presets",
                False,
                "reason_for_giving",
                GENERIC_UNEXPECTED_VALUE,
            ),
            (
                {"reason_for_giving": "My reason"},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                False,
                "reason_for_giving",
                GENERIC_UNEXPECTED_VALUE,
            ),
            (
                {"reason_for_giving": "My reason"},
                "donation_page_with_unrequired_reason_for_giving_element_and_presets",
                False,
                "reason_for_giving",
                GENERIC_UNEXPECTED_VALUE,
            ),
            (
                {"reason_for_giving": PRESET_REASONS[0]},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                True,
                None,
                None,
            ),
            (
                {"reason_for_giving": PRESET_REASONS[0]},
                "donation_page_with_unrequired_reason_for_giving_element_and_presets",
                True,
                None,
                None,
            ),
        ],
    )
    def test_validate_reason_for_giving(
        self,
        input_data,
        expect_valid,
        minimally_valid_data,
        requested_page,
        error_key,
        error_msg,
        donation_page,
        donation_page_with_conditionally_required_reason_for_giving_element_no_presets,
        donation_page_with_conditionally_required_reason_for_giving_element_and_presets,
        donation_page_with_unrequired_reason_for_giving_element_and_presets,
    ):
        """Test logic around reason_for_giving validation.

        NB: For some of the parametrized scenarios, this test expects to find a validation error for
        "reason_other" instead of "reason_for_giving". We test that behavior as part of this test rather than
        elsewhere because "reason_for_giving" gets rewritten to be the value of "reason_other" via the
        `BaseCreatePaymentSerializer.resolve_reason_for_giving`, so the two fields are inter-related.
        """
        data = minimally_valid_data | input_data
        data["page"] = get_donation_page_fixture(
            requested_page,
            donation_page=donation_page,
            donation_page_with_conditionally_required_reason_for_giving_element_no_presets=(
                donation_page_with_conditionally_required_reason_for_giving_element_no_presets
            ),
            donation_page_with_conditionally_required_reason_for_giving_element_and_presets=(
                donation_page_with_conditionally_required_reason_for_giving_element_and_presets
            ),
            donation_page_with_unrequired_reason_for_giving_element_and_presets=(
                donation_page_with_unrequired_reason_for_giving_element_and_presets
            ),
        ).id
        serializer = self.serializer_class(data=data)
        assert serializer.is_valid() is expect_valid
        if expect_valid is False:
            assert set(serializer.errors.keys()) == set([error_key])
            assert serializer.errors[error_key][0] == error_msg

    # @pytest.mark.parametrize(
    #     "input_data,expect_valid",
    #     [
    #         ({}, True),
    #         ({"reason_for_giving": "Other", "reason_other": ""}, False),
    #         ({"reason_for_giving": "Other"}, False),
    #         ({"reason_for_giving": "Other", "reason_other": "Reason"}, True),
    #         ({"reason_for_giving": "My reason"}, True),
    #         ({"reason_for_giving": "My reason", "reason_other": ""}, True),
    #         ({"reason_other": "Reason"}, True),
    #     ],
    # )
    # def test_validate_tribute_type(self, input_data, ):
    #     pass

    @pytest.mark.parametrize(
        "input_data,expect_valid",
        [
            # ({}, True),
            # ({"tribute_type": "type_honoree", "honoree": ""}, False),
            ({"tribute_type": "type_honoree"}, False),
            # ({"tribute_type": "type_honoree", "honoree": "Paul"}, True),
        ],
    )
    def test_validate_honoree(self, input_data, expect_valid, minimally_valid_data):
        """Show `honoree` cannot be blank when `tribute_type` is `type_honoree`"""
        error_key = "honoree"
        data = minimally_valid_data | input_data
        serializer = self.serializer_class(data=data)
        assert serializer.is_valid() is expect_valid
        if expect_valid is False:
            assert set(serializer.errors.keys()) == set([error_key])
            assert serializer.errors[error_key][error_key] == GENERIC_BLANK

    @pytest.mark.parametrize(
        "input_data,expect_valid",
        [
            ({}, True),
            ({"tribute_type": "type_in_memory_of", "in_memory_of": ""}, False),
            ({"tribute_type": "type_in_memory_of"}, False),
            ({"tribute_type": "type_in_memory_of", "in_memory_of": "Paul"}, True),
        ],
    )
    def test_validate_in_memory_of(self, input_data, expect_valid, minimally_valid_data):
        """Show `in_memory_of` cannot be blank when `tribute_type` is `type_in_memory_of`"""
        error_key = "in_memory_of"
        data = minimally_valid_data | input_data
        serializer = self.serializer_class(data=data)
        assert serializer.is_valid() is expect_valid
        if expect_valid is False:
            assert set(serializer.errors.keys()) == set([error_key])
            assert serializer.errors[error_key][error_key] == GENERIC_BLANK

    @pytest.mark.parametrize(
        "ad_hoc_data,expect_valid",
        [
            ({"reason_for_giving": ""}, False),
            ({"reason_for_giving": "Preset Reason 1"}, True),
            ({"reason_for_giving": "Other", "reason_other": "My special reason"}, True),
            ({"reason_for_giving": "Other", "reason_other": ""}, False),
            ({"reason_for_giving": "Other"}, False),
            ({"reason_other": "My special reason"}, True),
        ],
    )
    def test_conditional_reason_for_giving_validation(
        self,
        minimally_valid_data,
        donation_page_with_conditionally_required_reason_for_giving_element,
        ad_hoc_data,
        expect_valid,
    ):
        """Show that our custom `validate` method handles conditionally required elements — namely, `phone` and `reason_for_giving`"""
        data = (
            minimally_valid_data
            | ad_hoc_data
            | {"page": donation_page_with_conditionally_required_reason_for_giving_element.id}
        )
        serializer = self.serializer_class(data=data)
        assert serializer.is_valid() is expect_valid
        if not expect_valid:
            assert set(serializer.errors.keys()) == set(["reason_for_giving"])
            assert serializer.errors["reason_for_giving"][0] == GENERIC_BLANK

    @pytest.mark.parametrize(
        "ad_hoc_data,expect_valid",
        [
            ({"phone": ""}, False),
            ({"phone": "555-555-5555"}, True),
        ],
    )
    def test_conditional_phone_element_validation(
        self, minimally_valid_data, donation_page_with_conditionally_required_phone_element, ad_hoc_data, expect_valid
    ):
        """Show that our custom `validate` method handles conditionally required elements — namely, `phone` and `reason_for_giving`"""
        data = minimally_valid_data | ad_hoc_data | {"page": donation_page_with_conditionally_required_phone_element.id}
        serializer = self.serializer_class(data=data)
        assert serializer.is_valid() is expect_valid
        if not expect_valid:
            assert set(serializer.errors.keys()) == set(["phone"])
            assert serializer.errors["phone"][0] == GENERIC_BLANK

    @pytest.mark.parametrize(
        "input_data,expected_resolved_value",
        [
            ({"reason_for_giving": "Other", "reason_other": "My reason"}, "My reason"),
            ({"reason_for_giving": "Reason A"}, "Reason A"),
        ],
    )
    def test_validate_resolves_reason_for_giving(self, input_data, expected_resolved_value, minimally_valid_data):
        """Show validation sets value of `reason_for_giving` to value of `reason_other` when initial value...

        ...for former is 'Other'.

        See note in BaseCreatePaymentSerializer.validate for explanation of why this happens in
        `validate`.
        """
        data = minimally_valid_data | input_data
        serializer = self.serializer_class(data=data)
        assert serializer.is_valid() is True
        assert serializer.validated_data["reason_for_giving"] == expected_resolved_value

    def test_get_bad_actor_score_happy_path(self, minimally_valid_data, monkeypatch):
        """Show that calling `get_bad_actor_score` returns response data

        Note: `get_bad_actor` uses `BadActorSerializer` internally, which requires there to be an
        HTTP referer in the request, so that's why we set in request factory below.
        """
        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_data, context={"request": request})
        assert serializer.is_valid() is True
        bad_actor_data = serializer.get_bad_actor_score(serializer.validated_data)
        assert bad_actor_data == MockBadActorResponseObjectNotBad.mock_bad_actor_response_json

    def test_get_bad_actor_score_when_data_invalid(self, minimally_valid_data, monkeypatch):
        """Show if the bad actor serialier data is invalid no exception is raise, but method returns None

        We achieve an invalid state by omitting http referer from the request context
        """
        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        request = APIRequestFactory().post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_data, context={"request": request})
        assert serializer.is_valid() is True
        bad_actor_data = serializer.get_bad_actor_score(serializer.validated_data)
        assert bad_actor_data is None

    def test_get_bad_actor_score_when_bad_actor_api_error(self, minimally_valid_data, monkeypatch):
        """Show if call to `make_bad_actor_request` in `get_bad_actor_score` results in BadActorAPIError, the

        method call still succeeds, returning None.
        """
        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor_raise_exception)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_data, context={"request": request})
        assert serializer.is_valid() is True
        bad_actor_data = serializer.get_bad_actor_score(serializer.validated_data)
        assert bad_actor_data is None

    @pytest.mark.parametrize(
        "score,should_fail",
        [
            (settings.BAD_ACTOR_FAILURE_THRESHOLD - 1, False),
            (settings.BAD_ACTOR_FAILURE_THRESHOLD, True),
            (settings.BAD_ACTOR_FAILURE_THRESHOLD + 1, True),
        ],
    )
    def test_should_flag(self, score, should_fail, minimally_valid_data):
        serializer = self.serializer_class(data=minimally_valid_data)
        assert serializer.should_flag(score) is should_fail

    def test_get_stripe_payment_metadata_happy_path(self, minimally_valid_data):
        contributor = ContributorFactory()
        referer = "https://www.google.com"
        request = APIRequestFactory(HTTP_REFERER=referer).post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_data, context={"request": request})
        assert serializer.is_valid() is True
        metadata = serializer.get_stripe_payment_metadata(contributor, serializer.validated_data)
        assert metadata == {
            "source": settings.METADATA_SOURCE,
            "schema_version": settings.METADATA_SCHEMA_VERSION,
            "contributor_id": contributor.id,
            "agreed_to_pay_fees": serializer.validated_data["agreed_to_pay_fees"],
            "donor_selected_amount": serializer.validated_data["amount"],
            "reason_for_giving": serializer.validated_data["reason_for_giving"],
            "honoree": serializer.validated_data.get("honoree"),
            "in_memory_of": serializer.validated_data.get("in_memory_of"),
            "comp_subscription": serializer.validated_data.get("comp_subscription"),
            "swag_opt_out": serializer.validated_data.get("swag_opt_out"),
            "swag_choice": serializer.validated_data.get("swag_choice"),
            "referer": referer,
            "revenue_program_id": serializer.validated_data["page"].revenue_program.id,
            "sf_campaign_id": serializer.validated_data.get("sf_campaign_id"),
        }

    def test_create_stripe_customer(self, minimally_valid_data, monkeypatch):
        """Show that the `.create_stripe_customer` method calls `Contributor.create_stripe_customer` with

        expected values. We don't test beyond this because `Contributor.create_stripe_customer` is itself unit tested
        elsewhere
        """
        mock_create_stripe_customer = Mock()
        monkeypatch.setattr(
            "apps.contributions.tests.factories.models.Contributor.create_stripe_customer", mock_create_stripe_customer
        )
        contributor = ContributorFactory()
        serializer = self.serializer_class(data=minimally_valid_data)
        assert serializer.is_valid() is True
        serializer.create_stripe_customer(contributor, serializer.validated_data)
        assert mock_create_stripe_customer.called_once_with(
            serializer.validated_data["page"].revenue_program.stripe_account_id,
            customer_name=f"{serializer.validated_data.get('first_name')} {serializer.validated_data.get('last_name')}",
            phone=serializer.validated_data["phone"],
            street=serializer.validated_data["mailing_street"],
            city=serializer.validated_data["mailing_city"],
            state=serializer.validated_data["mailing_state"],
            postal_code=serializer.validated_data["mailing_postal_code"],
            country=serializer.validated_data["mailing_country"],
            metadata={
                "source": settings.METADATA_SOURCE,
                "schema_version": settings.METADATA_SCHEMA_VERSION,
                "contributor_id": contributor.id,
            },
        )

    def test_create_contribution_happy_path(self, minimally_valid_data):
        contribution_count = Contribution.objects.count()
        bad_actor_data = {"overall_judgment": settings.BAD_ACTOR_FAILURE_THRESHOLD - 1}
        contributor = ContributorFactory()
        serializer = self.serializer_class(data=minimally_valid_data)
        assert serializer.is_valid() is True
        contribution = serializer.create_contribution(contributor, serializer.validated_data, bad_actor_data)
        assert Contribution.objects.count() == contribution_count + 1
        expectations = {
            "amount": serializer.validated_data["amount"],
            "interval": serializer.validated_data["interval"],
            "currency": serializer.validated_data["page"].revenue_program.payment_provider.currency,
            "status": ContributionStatus.PROCESSING,
            "donation_page": serializer.validated_data["page"],
            "contributor": contributor,
            "payment_provider_used": "Stripe",
            "bad_actor_score": bad_actor_data["overall_judgment"],
            "bad_actor_response": bad_actor_data,
            "flagged_date": None,
        }
        for key, val in expectations.items():
            assert getattr(contribution, key) == val

    def test_create_contribution_when_should_flag(self, minimally_valid_data):
        contribution_count = Contribution.objects.count()
        bad_actor_data = {"overall_judgment": settings.BAD_ACTOR_FAILURE_THRESHOLD}
        contributor = ContributorFactory()
        serializer = self.serializer_class(data=minimally_valid_data)
        assert serializer.is_valid() is True
        contribution = serializer.create_contribution(contributor, serializer.validated_data, bad_actor_data)
        assert Contribution.objects.count() == contribution_count + 1
        expectations = {
            "amount": serializer.validated_data["amount"],
            "interval": serializer.validated_data["interval"],
            "currency": serializer.validated_data["page"].revenue_program.payment_provider.currency,
            "status": ContributionStatus.FLAGGED,
            "donation_page": serializer.validated_data["page"],
            "contributor": contributor,
            "payment_provider_used": "Stripe",
            "bad_actor_score": bad_actor_data["overall_judgment"],
            "bad_actor_response": bad_actor_data,
        }
        for key, val in expectations.items():
            assert getattr(contribution, key) == val
        assert contribution.flagged_date is not None

    def test_create_contribution_when_no_bad_actor_response(self, minimally_valid_data):
        contribution_count = Contribution.objects.count()
        bad_actor_data = None
        contributor = ContributorFactory()
        serializer = self.serializer_class(data=minimally_valid_data)
        assert serializer.is_valid() is True
        contribution = serializer.create_contribution(contributor, serializer.validated_data, bad_actor_data)
        assert Contribution.objects.count() == contribution_count + 1
        expectations = {
            "amount": serializer.validated_data["amount"],
            "interval": serializer.validated_data["interval"],
            "currency": serializer.validated_data["page"].revenue_program.payment_provider.currency,
            "status": ContributionStatus.PROCESSING,
            "donation_page": serializer.validated_data["page"],
            "contributor": contributor,
            "payment_provider_used": "Stripe",
            "bad_actor_score": None,
            "bad_actor_response": None,
            "flagged_date": None,
        }
        for key, val in expectations.items():
            assert getattr(contribution, key) == val


@pytest.mark.django_db
class TestCreateOneTimePaymentSerializer:

    serializer_class = serializers.CreateOneTimePaymentSerializer

    def test_is_subclass_of_BaseCreatePaymentSerializer(self):
        """Prove that CreateOneTimePaymentSerializer is a subclass of BaseCreatePaymentSerializer

        This is so the testing of the parent class' behavior accrues to the child.
        """
        assert issubclass(self.serializer_class, serializers.BaseCreatePaymentSerializer)

    def test_happy_path(self, monkeypatch, minimally_valid_data):
        """Demonstrate happy path when of `.create`

        Namely, it should:

        - create a contributor
        - create a contribution
        - add bad actor score to contribution
        - not flag the contribution
        - Create a Stripe Customer
        - Create a Stripe PaymentIntent
        - return a dict with `provider_client_secret_id`
        """
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        mock_create_stripe_customer = Mock()
        mock_create_stripe_customer.return_value = {"id": "some id"}
        monkeypatch.setattr("apps.contributions.models.Contributor.create_stripe_customer", mock_create_stripe_customer)
        mock_create_stripe_one_time_payment_intent = Mock()
        client_secret = "shhhhhhh!"
        mock_create_stripe_one_time_payment_intent.return_value = {
            "id": "some payment intent id",
            "client_secret": client_secret,
        }
        monkeypatch.setattr(
            "apps.contributions.models.stripe.PaymentIntent.create", mock_create_stripe_one_time_payment_intent
        )
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_data, context={"request": request})
        assert serializer.is_valid()
        result = serializer.create(serializer.validated_data)
        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert set(result.keys()) == set(["provider_client_secret_id"])
        assert result["provider_client_secret_id"] == client_secret
        assert Contributor.objects.filter(email=minimally_valid_data["email"]).exists()
        contribution = Contribution.objects.get(provider_client_secret_id=client_secret)
        assert contribution.status == ContributionStatus.PROCESSING
        assert contribution.flagged_date is None
        assert contribution.bad_actor_response == MockBadActorResponseObjectNotBad.mock_bad_actor_response_json

    def test_when_stripe_errors_creating_payment_intent(self, minimally_valid_data, monkeypatch):
        """Demonstrate `.create` when there's a Stripe error when creating payment intent

        A contributor and contribution should still be created as in happy path, but a GenericPaymentError should
        be raised.

        """
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        mock_create_stripe_customer = Mock()
        mock_create_stripe_customer.return_value = {"id": "some id"}
        monkeypatch.setattr("apps.contributions.models.Contributor.create_stripe_customer", mock_create_stripe_customer)
        monkeypatch.setattr("apps.contributions.models.stripe.PaymentIntent.create", mock_stripe_call_with_error)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")

        serializer = self.serializer_class(data=minimally_valid_data, context={"request": request})

        assert serializer.is_valid()
        with pytest.raises(serializers.GenericPaymentError):
            serializer.create(serializer.validated_data)

        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert Contributor.objects.filter(email=minimally_valid_data["email"]).exists()
        contributor = Contributor.objects.get(email=minimally_valid_data["email"])
        assert contributor.contribution_set.count() == 1
        contribution = contributor.contribution_set.first()
        assert contribution.status == ContributionStatus.PROCESSING

    def test_when_stripe_errors_creating_customer(self, minimally_valid_data, monkeypatch):
        """Demonstrate `.create` when there's a Stripe error when creating customer

        A contributor and contribution should still be created as in happy path, but a GenericPaymentError should
        be raised.
        """
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        monkeypatch.setattr("apps.contributions.models.Contributor.create_stripe_customer", mock_stripe_call_with_error)

        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")

        serializer = self.serializer_class(data=minimally_valid_data, context={"request": request})

        assert serializer.is_valid()

        with pytest.raises(serializers.GenericPaymentError):
            serializer.create(serializer.validated_data)

        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert Contributor.objects.filter(email=minimally_valid_data["email"]).exists()
        contributor = Contributor.objects.get(email=minimally_valid_data["email"])
        assert contributor.contribution_set.count() == 1
        contribution = contributor.contribution_set.first()
        assert contribution.status == ContributionStatus.PROCESSING

    def test_when_contribution_is_flagged(self, minimally_valid_data, monkeypatch):
        """Demonstrate `.create` when the contribution gets flagged

        A contributor and contribution should still be created as in happy path, but a PermissionDenied error should occur, and
        a Stripe payment intent should not be created.
        """

        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()
        monkeypatch.setattr(
            "apps.contributions.serializers.make_bad_actor_request",
            lambda x: mock_get_bad_actor(response=MockBadActorResponseObjectBad),
        )

        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_data, context={"request": request})

        assert serializer.is_valid()

        with pytest.raises(PermissionDenied):
            serializer.create(serializer.validated_data)

        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert Contributor.objects.filter(email=minimally_valid_data["email"]).exists()
        contributor = Contributor.objects.get(email=minimally_valid_data["email"])
        assert contributor.contribution_set.count() == 1
        contribution = contributor.contribution_set.first()
        assert contribution.status == ContributionStatus.FLAGGED
        assert contribution.flagged_date is not None
        # we take the next two assertions as evidence that Stripe PaymentIntent not created
        assert contribution.provider_client_secret_id is None
        assert contribution.provider_payment_id is None


@pytest.mark.django_db
class TestCreateRecurringPaymentSerializer:

    serializer_class = serializers.CreateRecurringPaymentSerializer

    def test_is_subclass_of_BaseCreatePaymentSerializer(self):
        """Prove that CreateRecurringPaymentSerializer is a subclass of BaseCreatePaymentSerializer

        This is so the testing of the parent class' behavior accrues to the child.
        """
        assert issubclass(self.serializer_class, serializers.BaseCreatePaymentSerializer)

    @pytest.mark.parametrize("interval", ["month", "year"])
    def test_happy_path(self, monkeypatch, minimally_valid_data, interval):
        """Demonstrate happy path when of `.create`

        Namely, it should:

        - create a contributor
        - create a contribution
        - add bad actor score to contribution
        - not flag the contribution
        - create a Stripe Customer
        - create a Stripe Subscription
        - return a dict with `provider_client_secret_id`
        """
        data = minimally_valid_data | {"interval": interval}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        mock_create_stripe_customer = Mock()
        mock_create_stripe_customer.return_value = {"id": "some id"}
        monkeypatch.setattr("apps.contributions.models.Contributor.create_stripe_customer", mock_create_stripe_customer)
        mock_create_stripe_subscription = Mock()
        client_secret = "shhhhhhh!"
        mock_create_stripe_subscription.return_value = {
            "id": "some payment intent id",
            "latest_invoice": {"payment_intent": {"client_secret": client_secret}},
        }
        monkeypatch.setattr("apps.contributions.models.stripe.Subscription.create", mock_create_stripe_subscription)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=data, context={"request": request})

        assert serializer.is_valid()
        result = serializer.create(serializer.validated_data)
        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert set(result.keys()) == set(["provider_client_secret_id"])
        assert result["provider_client_secret_id"] == client_secret
        assert Contributor.objects.filter(email=minimally_valid_data["email"]).exists()
        contribution = Contribution.objects.get(provider_client_secret_id=client_secret)
        assert contribution.status == ContributionStatus.PROCESSING
        assert contribution.flagged_date is None
        assert contribution.bad_actor_response == MockBadActorResponseObjectNotBad.mock_bad_actor_response_json
        assert contribution.payment_provider_data == mock_create_stripe_subscription.return_value
        assert contribution.provider_subscription_id == mock_create_stripe_subscription.return_value["id"]

    def test_when_stripe_errors_creating_subscription(self, minimally_valid_data, monkeypatch):
        """Demonstrate `.create` when there's a Stripe error when creating subscription

        A contributor and contribution should still be created as in happy path, but a GenericPaymentError should
        be raised, and no Stripe subscription created.
        """
        data = minimally_valid_data | {"interval": "month"}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        mock_create_stripe_customer = Mock()
        mock_create_stripe_customer.return_value = {"id": "some id"}
        monkeypatch.setattr("apps.contributions.models.Contributor.create_stripe_customer", mock_create_stripe_customer)
        monkeypatch.setattr("apps.contributions.models.stripe.Subscription.create", mock_stripe_call_with_error)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")

        serializer = self.serializer_class(data=data, context={"request": request})

        assert serializer.is_valid()
        with pytest.raises(serializers.GenericPaymentError):
            serializer.create(serializer.validated_data)

        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert Contributor.objects.filter(email=minimally_valid_data["email"]).exists()
        contributor = Contributor.objects.get(email=minimally_valid_data["email"])
        assert contributor.contribution_set.count() == 1
        contribution = contributor.contribution_set.first()
        assert contribution.status == ContributionStatus.PROCESSING
        assert contribution.provider_subscription_id is None
        assert contribution.provider_client_secret_id is None
        assert contribution.payment_provider_data is None

    def test_when_stripe_errors_creating_customer(self, monkeypatch, minimally_valid_data):
        """Demonstrate `.create` when there's a Stripe error when creating customer

        A contributor and contribution should still be created as in happy path, but a GenericPaymentError should
        be raised.
        """
        data = minimally_valid_data | {"interval": "month"}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        monkeypatch.setattr("apps.contributions.models.Contributor.create_stripe_customer", mock_stripe_call_with_error)

        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")

        serializer = self.serializer_class(data=data, context={"request": request})

        assert serializer.is_valid()

        with pytest.raises(serializers.GenericPaymentError):
            serializer.create(serializer.validated_data)

        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert Contributor.objects.filter(email=minimally_valid_data["email"]).exists()
        contributor = Contributor.objects.get(email=minimally_valid_data["email"])
        assert contributor.contribution_set.count() == 1
        contribution = contributor.contribution_set.first()
        assert contribution.status == ContributionStatus.PROCESSING
        assert contribution.provider_subscription_id is None
        assert contribution.provider_client_secret_id is None
        assert contribution.payment_provider_data is None

    def test_when_contribution_is_flagged(self, minimally_valid_data, monkeypatch):
        """Demonstrate `.create` when the contribution gets flagged.

        A contributor and contribution should still be created as in happy path, but a PermissionDenied error should occur, and
        a Stripe subscription should not be created.
        """
        data = minimally_valid_data | {"interval": "month"}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()
        monkeypatch.setattr(
            "apps.contributions.serializers.make_bad_actor_request",
            lambda x: mock_get_bad_actor(response=MockBadActorResponseObjectBad),
        )

        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=data, context={"request": request})

        assert serializer.is_valid()

        with pytest.raises(PermissionDenied):
            serializer.create(serializer.validated_data)

        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert Contributor.objects.filter(email=minimally_valid_data["email"]).exists()
        contributor = Contributor.objects.get(email=minimally_valid_data["email"])
        assert contributor.contribution_set.count() == 1
        contribution = contributor.contribution_set.first()
        assert contribution.status == ContributionStatus.FLAGGED
        assert contribution.flagged_date is not None
        assert contribution.provider_subscription_id is None
        assert contribution.provider_client_secret_id is None
        assert contribution.payment_provider_data is None
