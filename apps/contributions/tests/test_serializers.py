import datetime
from datetime import timedelta
from unittest.mock import Mock, patch

from django.conf import settings
from django.test import TestCase
from django.utils import timezone

import pytest
import stripe
from addict import Dict as AttrDict
from pytest import raises
from rest_framework.exceptions import PermissionDenied
from rest_framework.serializers import ValidationError
from rest_framework.test import APIRequestFactory

from apps.api.error_messages import GENERIC_BLANK, GENERIC_UNEXPECTED_VALUE
from apps.contributions import serializers
from apps.contributions.bad_actor import BadActorAPIError
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Contributor,
)
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.contributions.utils import format_ambiguous_currency, get_sha256_hash
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory


class ContributionSerializer(TestCase):
    expected_fields = [
        "amount",
        "auto_accepted_on",
        "bad_actor_score",
        "contributor_email",
        "created",
        "currency",
        "donation_page_id",
        "flagged_date",
        "formatted_payment_provider_used",
        "id",
        "interval",
        "last_payment_date",
        "provider_customer_url",
        "provider_payment_url",
        "provider_subscription_url",
        "revenue_program",
        "status",
    ]

    def setUp(self):
        self.serializer = serializers.ContributionSerializer
        self.contributor = ContributorFactory()
        # This is to squash a side effect in contribution.save
        # TODO: DEV-3026
        with patch("apps.contributions.models.Contribution.fetch_stripe_payment_method", return_value=None):
            self.contribution = ContributionFactory(
                amount=1000, contributor=self.contributor, payment_provider_used="Stripe"
            )

    def test_returned_fields(self):
        data = self.serializer(self.contribution).data
        assert set(data.keys()) == set(self.expected_fields)

    def test_get_auto_accepted_on(self):
        # Should return null if empty
        self.contribution.flagged_date = None
        self.contribution.save()
        old_data = self.serializer(self.contribution).data
        self.assertIsNone(old_data["auto_accepted_on"])
        # Should return a datetime equal to flagged_date + "FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA" setting
        self.contribution.flagged_date = timezone.now()
        self.contribution.save()
        target_date = self.contribution.flagged_date + timedelta(settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA)
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
            "mailing_complement": "test",
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
        "donor_selected_amount": 120.0,
        "amount": 123.01,
        "email": "foo@bar.com",
        "page": donation_page.id,
        "interval": "one_time",
        "first_name": "Foo",
        "last_name": "Bar",
        "mailing_postal_code": "12345",
        "mailing_street": "123 Street St",
        "mailing_complement": "Ap 1",
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

    mock_bad_actor_response_json = {"overall_judgment": settings.BAD_ACTOR_FLAG_SCORE - 1}

    @classmethod
    def json(cls):
        return cls.mock_bad_actor_response_json


class MockBadActorResponseObjectBad:
    """Used in tests below to simulate response returned by make_bad_actor_request

    See https://docs.pytest.org/en/7.1.x/how-to/monkeypatch.html for more info on how/why
    """

    mock_bad_actor_response_json = {"overall_judgment": settings.BAD_ACTOR_FLAG_SCORE}

    @classmethod
    def json(cls):
        return cls.mock_bad_actor_response_json


class MockBadActorResponseObjectSuperBad:
    """Used in tests below to simulate response returned by make_bad_actor_request

    See https://docs.pytest.org/en/7.1.x/how-to/monkeypatch.html for more info on how/why
    """

    mock_bad_actor_response_json = {"overall_judgment": settings.BAD_ACTOR_REJECT_SCORE}

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
        "input_data,requested_page,expect_valid",
        [
            ({"reason_for_giving": "Other", "reason_other": ""}, "donation_page", False),
            (
                {"reason_for_giving": "Other", "reason_other": ""},
                "donation_page_with_conditionally_required_reason_for_giving_element_no_presets",
                False,
            ),
            (
                {"reason_for_giving": "Other", "reason_other": ""},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                False,
            ),
            (
                {"reason_for_giving": "Other", "reason_other": ""},
                "donation_page_with_unrequired_reason_for_giving_element_and_presets",
                False,
            ),
            ({"reason_for_giving": "Other"}, "donation_page", False),
            (
                {"reason_for_giving": "Other"},
                "donation_page_with_conditionally_required_reason_for_giving_element_no_presets",
                False,
            ),
            (
                {"reason_for_giving": "Other"},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                False,
            ),
            (
                {"reason_for_giving": "Other"},
                "donation_page_with_unrequired_reason_for_giving_element_and_presets",
                False,
            ),
            ({"reason_other": "Reason"}, "donation_page", True),
            (
                {"reason_other": "Reason"},
                "donation_page_with_conditionally_required_reason_for_giving_element_no_presets",
                True,
            ),
            (
                {"reason_other": "Reason"},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                True,
            ),
            (
                {"reason_other": "Reason"},
                "donation_page_with_unrequired_reason_for_giving_element_and_presets",
                True,
            ),
        ],
    )
    def test_validate_reason_other(
        self,
        input_data,
        requested_page,
        expect_valid,
        minimally_valid_data,
        donation_page,
        donation_page_with_conditionally_required_reason_for_giving_element_no_presets,
        donation_page_with_conditionally_required_reason_for_giving_element_and_presets,
        donation_page_with_unrequired_reason_for_giving_element_and_presets,
    ):
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
            assert set(serializer.errors.keys()) == set(["reason_other"])
            assert serializer.errors["reason_other"][0] == GENERIC_BLANK

    @pytest.mark.parametrize(
        "input_data,requested_page,expect_valid,error_msg",
        [
            ({}, "donation_page", True, None),
            (
                {},
                "donation_page_with_conditionally_required_reason_for_giving_element_no_presets",
                False,
                GENERIC_BLANK,
            ),
            (
                {},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                False,
                GENERIC_BLANK,
            ),
            ({}, "donation_page_with_unrequired_reason_for_giving_element_and_presets", True, None),
            ({"reason_for_giving": "Other", "reason_other": "Reason"}, "donation_page", True, None),
            (
                {"reason_for_giving": "Other", "reason_other": "Reason"},
                "donation_page_with_conditionally_required_reason_for_giving_element_no_presets",
                True,
                None,
            ),
            (
                {"reason_for_giving": "Other", "reason_other": "Reason"},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                True,
                None,
            ),
            (
                {"reason_for_giving": "Other", "reason_other": "Reason"},
                "donation_page_with_unrequired_reason_for_giving_element_and_presets",
                True,
                None,
            ),
            ({"reason_for_giving": "My reason"}, "donation_page", False, GENERIC_UNEXPECTED_VALUE),
            (
                {"reason_for_giving": "My reason"},
                "donation_page_with_conditionally_required_reason_for_giving_element_no_presets",
                False,
                GENERIC_UNEXPECTED_VALUE,
            ),
            (
                {"reason_for_giving": "My reason"},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                False,
                GENERIC_UNEXPECTED_VALUE,
            ),
            (
                {"reason_for_giving": "My reason"},
                "donation_page_with_unrequired_reason_for_giving_element_and_presets",
                False,
                GENERIC_UNEXPECTED_VALUE,
            ),
            (
                {"reason_for_giving": PRESET_REASONS[0]},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                True,
                None,
            ),
            (
                {"reason_for_giving": PRESET_REASONS[0]},
                "donation_page_with_unrequired_reason_for_giving_element_and_presets",
                True,
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
        error_msg,
        donation_page,
        donation_page_with_conditionally_required_reason_for_giving_element_no_presets,
        donation_page_with_conditionally_required_reason_for_giving_element_and_presets,
        donation_page_with_unrequired_reason_for_giving_element_and_presets,
    ):
        """Test logic around reason_for_giving validation"""
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
        serializer = self.serializer_class(data=data, context={"request": APIRequestFactory().post("")})
        assert serializer.is_valid() is expect_valid
        if expect_valid is False:
            assert set(serializer.errors.keys()) == set(["reason_for_giving"])
            assert serializer.errors["reason_for_giving"][0] == error_msg

    @pytest.mark.parametrize(
        "input_data,requested_page,expect_valid",
        [
            ({"phone": ""}, "donation_page", True),
            ({"phone": "something"}, "donation_page", True),
            ({"phone": ""}, "donation_page_with_conditionally_required_phone_element", False),
            ({"phone": "something"}, "donation_page_with_conditionally_required_phone_element", True),
        ],
    )
    def test_validate_phone(
        self,
        input_data,
        requested_page,
        expect_valid,
        donation_page,
        donation_page_with_conditionally_required_phone_element,
        minimally_valid_data,
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
            donation_page_with_conditionally_required_phone_element=(
                donation_page_with_conditionally_required_phone_element
            ),
        ).id
        serializer = self.serializer_class(data=data, context={"request": APIRequestFactory().post("")})
        assert serializer.is_valid() is expect_valid
        if expect_valid is False:
            assert set(serializer.errors.keys()) == set(["phone"])
            assert serializer.errors["phone"][0] == GENERIC_BLANK

    @pytest.mark.parametrize(
        "input_data,expect_valid",
        [
            ({"tribute_type": "unexpected"}, False),
            ({"tribute_type": "type_honoree", "honoree": "Someone"}, True),
            ({"tribute_type": "type_in_memory_of", "in_memory_of": "Someone"}, True),
        ],
    )
    def test_validate_tribute_type(self, input_data, expect_valid, minimally_valid_data):
        data = minimally_valid_data | input_data
        serializer = self.serializer_class(data=data, context={"request": APIRequestFactory().post("")})
        assert serializer.is_valid() is expect_valid
        if expect_valid is False:
            assert set(serializer.errors.keys()) == set(["tribute_type"])
            assert serializer.errors["tribute_type"][0] == GENERIC_UNEXPECTED_VALUE

    @pytest.mark.parametrize(
        "input_data,expect_valid",
        [
            ({}, True),
            ({"tribute_type": "type_honoree", "honoree": ""}, False),
            ({"tribute_type": "type_honoree", "honoree": "Paul"}, True),
        ],
    )
    def test_validate_honoree(self, input_data, expect_valid, minimally_valid_data):
        """Show `honoree` cannot be blank when `tribute_type` is `type_honoree`"""
        data = minimally_valid_data | input_data
        serializer = self.serializer_class(data=data, context={"request": APIRequestFactory().post("")})
        assert serializer.is_valid() is expect_valid
        if expect_valid is False:
            assert set(serializer.errors.keys()) == set(["honoree"])
            assert serializer.errors["honoree"][0] == GENERIC_BLANK

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
        data = minimally_valid_data | input_data
        serializer = self.serializer_class(data=data, context={"request": APIRequestFactory().post("")})
        assert serializer.is_valid() is expect_valid
        if expect_valid is False:
            assert set(serializer.errors.keys()) == set(["in_memory_of"])
            assert serializer.errors["in_memory_of"][0] == GENERIC_BLANK

    @pytest.mark.parametrize(
        "input_data,expected_resolved_value",
        [
            ({"reason_for_giving": "Other", "reason_other": "My reason"}, "My reason"),
            ({"reason_for_giving": PRESET_REASONS[0]}, PRESET_REASONS[0]),
        ],
    )
    def test_validate_resolves_reason_for_giving(
        self,
        input_data,
        expected_resolved_value,
        minimally_valid_data,
        donation_page_with_unrequired_reason_for_giving_element_and_presets,
    ):
        """Show validation sets value of `reason_for_giving` to value of `reason_other` when initial value...

        ...for former is 'Other'.

        See note in BaseCreatePaymentSerializer.validate for explanation of why this happens in
        `validate`.
        """
        data = (
            minimally_valid_data
            | input_data
            | {"page": donation_page_with_unrequired_reason_for_giving_element_and_presets.id}
        )
        serializer = self.serializer_class(data=data, context={"request": APIRequestFactory().post("")})
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
        "score,should_flag",
        [
            (settings.BAD_ACTOR_REJECT_SCORE, False),
            (settings.BAD_ACTOR_FLAG_SCORE, True),
            (settings.BAD_ACTOR_FLAG_SCORE - 1, False),
        ],
    )
    def test_should_flag(self, score, should_flag, minimally_valid_data):
        serializer = self.serializer_class(data=minimally_valid_data)
        assert serializer.should_flag(score) is should_flag

    def test_get_stripe_payment_metadata_happy_path(self, minimally_valid_data):
        contributor = ContributorFactory()
        referer = "https://www.google.com"
        request = APIRequestFactory(HTTP_REFERER=referer).post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_data, context={"request": request})
        assert serializer.is_valid() is True
        metadata = serializer.get_stripe_payment_metadata(contributor.id, serializer.validated_data)
        assert metadata == {
            "source": settings.METADATA_SOURCE,
            "schema_version": settings.METADATA_SCHEMA_VERSION,
            "contributor_id": contributor.id,
            "agreed_to_pay_fees": serializer.validated_data["agreed_to_pay_fees"],
            "donor_selected_amount": serializer.validated_data["donor_selected_amount"],
            "reason_for_giving": serializer.validated_data["reason_for_giving"],
            "honoree": serializer.validated_data.get("honoree"),
            "in_memory_of": serializer.validated_data.get("in_memory_of"),
            "comp_subscription": serializer.validated_data.get("comp_subscription"),
            "swag_opt_out": serializer.validated_data.get("swag_opt_out"),
            "swag_choice": serializer.validated_data.get("swag_choice"),
            "referer": referer,
            "revenue_program_id": serializer.validated_data["page"].revenue_program.id,
            "revenue_program_slug": serializer.validated_data["page"].revenue_program.slug,
            "sf_campaign_id": serializer.validated_data.get("sf_campaign_id"),
        }

    def test_create_contribution_happy_path(self, minimally_valid_data):
        contribution_count = Contribution.objects.count()
        bad_actor_data = {"overall_judgment": settings.BAD_ACTOR_FLAG_SCORE - 1}
        contributor = ContributorFactory()

        serializer = self.serializer_class(data=minimally_valid_data, context={"request": APIRequestFactory().post("")})
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
        bad_actor_data = {"overall_judgment": settings.BAD_ACTOR_FLAG_SCORE}
        contributor = ContributorFactory()
        serializer = self.serializer_class(data=minimally_valid_data, context={"request": APIRequestFactory().post("")})
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

    def test_create_contribution_when_should_reject(self, minimally_valid_data):
        contribution_count = Contribution.objects.count()
        bad_actor_data = {"overall_judgment": settings.BAD_ACTOR_REJECT_SCORE}
        contributor = ContributorFactory()
        serializer = self.serializer_class(data=minimally_valid_data, context={"request": APIRequestFactory().post("")})
        assert serializer.is_valid() is True
        contribution = serializer.create_contribution(contributor, serializer.validated_data, bad_actor_data)
        assert Contribution.objects.count() == contribution_count + 1
        expectations = {
            "amount": serializer.validated_data["amount"],
            "interval": serializer.validated_data["interval"],
            "currency": serializer.validated_data["page"].revenue_program.payment_provider.currency,
            "status": ContributionStatus.REJECTED,
            "donation_page": serializer.validated_data["page"],
            "contributor": contributor,
            "payment_provider_used": "Stripe",
            "bad_actor_score": bad_actor_data["overall_judgment"],
            "bad_actor_response": bad_actor_data,
            "flagged_date": None,
        }
        for key, val in expectations.items():
            assert getattr(contribution, key) == val

    def test_create_contribution_when_no_bad_actor_response(self, minimally_valid_data):
        contribution_count = Contribution.objects.count()
        bad_actor_data = None
        contributor = ContributorFactory()
        serializer = self.serializer_class(data=minimally_valid_data, context={"request": APIRequestFactory().post("")})
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

    def test_donation_page_when_element_not_have_required_fields(self, donation_page, minimally_valid_data):
        del donation_page.elements[0]["requiredFields"]
        donation_page.save()
        request = APIRequestFactory().post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_data, context={"request": request})
        assert serializer.is_valid()


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
        - create a contribution that has contribution_metadata
        - add bad actor score to contribution
        - not flag the contribution
        - Create a Stripe Customer
        - Create a Stripe PaymentIntent
        """
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        mock_create_stripe_customer = Mock()
        fake_customer_id = "fake-customer-id"
        mock_create_stripe_customer.return_value = {"id": fake_customer_id}
        monkeypatch.setattr(
            "apps.contributions.models.Contribution.create_stripe_customer", mock_create_stripe_customer
        )
        mock_create_stripe_one_time_payment_intent = Mock()
        client_secret = "shhhhhhh!"
        mock_create_stripe_one_time_payment_intent.return_value = {
            "id": "some payment intent id",
            "client_secret": client_secret,
            "customer": fake_customer_id,
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
        assert set(result.keys()) == set(["client_secret", "uuid", "email_hash"])
        assert result["client_secret"] == client_secret
        assert Contributor.objects.filter(email=minimally_valid_data["email"]).exists()
        contribution = Contribution.objects.get(uuid=result["uuid"])
        assert result["uuid"] == str(contribution.uuid)
        assert result["email_hash"] == get_sha256_hash(contribution.contributor.email)
        assert contribution.status == ContributionStatus.PROCESSING
        assert contribution.flagged_date is None
        assert contribution.bad_actor_response == MockBadActorResponseObjectNotBad.mock_bad_actor_response_json
        assert contribution.contribution_metadata is not None

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
        monkeypatch.setattr(
            "apps.contributions.models.Contribution.create_stripe_customer", mock_create_stripe_customer
        )
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
        assert contribution.contribution_metadata is not None

    def test_when_stripe_errors_creating_customer(self, minimally_valid_data, monkeypatch):
        """Demonstrate `.create` when there's a Stripe error when creating customer

        A contributor and contribution should still be created as in happy path, but a GenericPaymentError should
        be raised.
        """
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        monkeypatch.setattr(
            "apps.contributions.models.Contribution.create_stripe_customer", mock_stripe_call_with_error
        )

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
        assert contribution.contribution_metadata is not None

    def test_when_contribution_is_flagged(self, minimally_valid_data, monkeypatch):
        """Demonstrate `.create` when the contribution gets flagged

        A contributor, contribution, and Stripe entities should still be created as in happy path, but the `capture_method` on
        the PaymentIntent should be "manual"
        """
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()
        monkeypatch.setattr(
            "apps.contributions.serializers.make_bad_actor_request",
            lambda x: mock_get_bad_actor(response=MockBadActorResponseObjectBad),
        )
        mock_create_stripe_customer = Mock()
        fake_customer_id = "fake-customer-id"
        mock_create_stripe_customer.return_value = {"id": fake_customer_id}
        monkeypatch.setattr("stripe.Customer.create", mock_create_stripe_customer)

        mock_create_stripe_one_time_payment_intent = Mock()
        client_secret = "shhhhhhh!"
        pi_id = "some payment intent id"
        mock_create_stripe_one_time_payment_intent.return_value = {
            "id": pi_id,
            "client_secret": client_secret,
            "customer": fake_customer_id,
        }
        monkeypatch.setattr("stripe.PaymentIntent.create", mock_create_stripe_one_time_payment_intent)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_data, context={"request": request})
        assert serializer.is_valid()
        result = serializer.create(serializer.validated_data)
        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert set(result.keys()) == set(["client_secret", "email_hash", "uuid"])
        assert result["client_secret"] == client_secret
        assert Contributor.objects.filter(email=minimally_valid_data["email"]).exists()
        contribution = Contribution.objects.get(uuid=result["uuid"])
        assert result["email_hash"] == get_sha256_hash(contribution.contributor.email)
        assert contribution.status == ContributionStatus.FLAGGED
        assert contribution.flagged_date is not None
        assert contribution.bad_actor_response == MockBadActorResponseObjectBad.mock_bad_actor_response_json
        assert contribution.provider_payment_id == pi_id
        mock_create_stripe_customer.assert_called_once()

        call_args = mock_create_stripe_one_time_payment_intent.call_args[1]
        # this is nested, and not necessary to test here
        call_args.pop("metadata", None)
        assert call_args == {
            "amount": contribution.amount,
            "currency": contribution.currency,
            "customer": contribution.provider_customer_id,
            "receipt_email": contribution.contributor.email,
            "statement_descriptor_suffix": None,
            "stripe_account": contribution.donation_page.revenue_program.payment_provider.stripe_account_id,
            "capture_method": "manual",
        }

    def test_when_contribution_is_rejected(self, minimally_valid_data, monkeypatch):
        """Demonstrate `.create` when the contribution gets flagged

        A contributor and contribution should still be created as in happy path, but a PermissionDenied error should occur, and
        a Stripe payment intent should not be created.
        """

        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()
        monkeypatch.setattr(
            "apps.contributions.serializers.make_bad_actor_request",
            lambda x: mock_get_bad_actor(response=MockBadActorResponseObjectSuperBad),
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
        assert contribution.status == ContributionStatus.REJECTED
        assert contribution.flagged_date is None
        assert contribution.provider_customer_id is None
        assert contribution.provider_payment_id is None
        assert contribution.contribution_metadata is not None


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
        - create a contribution that has contribution_metadata
        - add bad actor score to contribution
        - not flag the contribution
        - create a Stripe Customer
        - create a Stripe Subscription
        """
        data = minimally_valid_data | {"interval": interval}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        mock_create_stripe_customer = Mock()
        fake_customer_id = "fake-customer-id"
        mock_create_stripe_customer.return_value = {"id": fake_customer_id}
        monkeypatch.setattr("stripe.Customer.create", mock_create_stripe_customer)
        mock_create_stripe_subscription = Mock()
        client_secret = "shhhhhhh!"
        mock_create_stripe_subscription.return_value = {
            "id": "some payment intent id",
            "latest_invoice": {"payment_intent": {"client_secret": client_secret, "id": "pi_fakefakefake"}},
            "customer": fake_customer_id,
        }
        monkeypatch.setattr("stripe.Subscription.create", mock_create_stripe_subscription)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=data, context={"request": request})

        assert serializer.is_valid()
        result = serializer.create(serializer.validated_data)
        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert set(result.keys()) == set(["client_secret", "email_hash", "uuid"])
        assert result["client_secret"] == client_secret
        assert Contributor.objects.filter(email=minimally_valid_data["email"]).exists()
        contribution = Contribution.objects.get(uuid=result["uuid"])
        assert result["email_hash"] == get_sha256_hash(contribution.contributor.email)
        assert contribution.status == ContributionStatus.PROCESSING
        assert contribution.flagged_date is None
        assert contribution.bad_actor_response == MockBadActorResponseObjectNotBad.mock_bad_actor_response_json
        assert contribution.payment_provider_data == mock_create_stripe_subscription.return_value
        assert contribution.provider_subscription_id == mock_create_stripe_subscription.return_value["id"]
        assert contribution.contribution_metadata is not None

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
        monkeypatch.setattr("stripe.Customer.create", mock_create_stripe_customer)
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
        assert contribution.provider_customer_id == mock_create_stripe_customer.return_value["id"]
        assert contribution.provider_subscription_id is None
        assert contribution.payment_provider_data is None
        assert contribution.contribution_metadata is not None

    def test_when_stripe_errors_creating_customer(self, monkeypatch, minimally_valid_data):
        """Demonstrate `.create` when there's a Stripe error when creating customer

        A contributor and contribution should still be created as in happy path, but a GenericPaymentError should
        be raised.
        """
        data = minimally_valid_data | {"interval": "month"}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        monkeypatch.setattr("stripe.Customer.create", mock_stripe_call_with_error)

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
        assert contribution.provider_customer_id is None
        assert contribution.provider_subscription_id is None
        assert contribution.payment_provider_data is None
        assert contribution.contribution_metadata is not None

    def test_when_contribution_is_flagged(self, minimally_valid_data, monkeypatch):
        """Demonstrate `.create` when the contribution gets flagged.

        All entities created in happy path should be created here, but the status on contribution should
        be "flagged" and the subscription should have a trial.
        """
        data = minimally_valid_data | {"interval": "month"}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()
        monkeypatch.setattr(
            "apps.contributions.serializers.make_bad_actor_request",
            lambda x: mock_get_bad_actor(response=MockBadActorResponseObjectBad),
        )
        mock_create_stripe_customer = Mock()
        fake_customer_id = "fake-customer-id"
        mock_create_stripe_customer.return_value = {"id": fake_customer_id}
        monkeypatch.setattr("stripe.Customer.create", mock_create_stripe_customer)
        mock_setup_intent_create = Mock()
        client_secret = "shhhhhhh!"
        setup_intent_id = "some-sub-id"
        payment_method_id = "some-payment-id"
        mock_setup_intent_create.return_value = {
            "id": setup_intent_id,
            "client_secret": client_secret,
            "payment_method": payment_method_id,
        }
        monkeypatch.setattr("stripe.SetupIntent.create", mock_setup_intent_create)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=data, context={"request": request})

        assert serializer.is_valid()
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
        assert contribution.provider_setup_intent_id == setup_intent_id

    def test_when_contribution_is_rejected(self, minimally_valid_data, monkeypatch):
        """Demonstrate `.create` when the contribution gets flagged.

        A contributor and contribution should still be created as in happy path, but a PermissionDenied error should occur, and
        a Stripe subscription should not be created.
        """
        data = minimally_valid_data | {"interval": "month"}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()
        monkeypatch.setattr(
            "apps.contributions.serializers.make_bad_actor_request",
            lambda x: mock_get_bad_actor(response=MockBadActorResponseObjectSuperBad),
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
        assert contribution.status == ContributionStatus.REJECTED
        assert contribution.flagged_date is None
        assert contribution.provider_subscription_id is None
        assert contribution.provider_customer_id is None
        assert contribution.payment_provider_data is None
        assert contribution.contribution_metadata is not None


class SubscriptionsSerializer(TestCase):
    expected_fields = [
        "id",
        "is_modifiable",
        "is_cancelable",
        "status",
        "card_brand",
        "last4",
        "payment_type",
        "next_payment_date",
        "interval",
        "revenue_program_slug",
        "amount",
        "customer_id",
        "credit_card_expiration_date",
        "created",
        "last_payment_date",
    ]

    def setUp(self):
        self.serializer = serializers.SubscriptionsSerializer
        self.subscription = AttrDict(
            {
                "id": "sub_1234",
                "status": "incomplete",
                "card_brand": "Visa",
                "last4": "4242",
                "plan": {
                    "interval": "month",
                    "interval_count": 1,
                    "amount": 1234,
                },
                "metadata": {
                    "revenue_program_slug": "foo",
                },
                "amount": "100",
                "customer": "cus_1234",
                "current_period_end": 1654892502,
                "current_period_start": 1686428502,
                "created": 1654892502,
                "default_payment_method": {
                    "id": "pm_1234",
                    "type": "card",
                    "card": {"brand": "discover", "last4": "7834", "exp_month": "12", "exp_year": "2022"},
                },
            }
        )

    def test_returned_fields(self):
        data = self.serializer(self.subscription).data
        for field in self.expected_fields:
            self.assertIn(field, data)

    def test_card_brand(self):
        data = self.serializer(self.subscription).data
        assert data["card_brand"] == "discover"

    def test_next_payment_date(self):
        data = self.serializer(self.subscription).data
        assert data["next_payment_date"] == datetime.datetime(2022, 6, 10, 20, 21, 42, tzinfo=datetime.timezone.utc)

    def test_last_payment_date(self):
        data = self.serializer(self.subscription).data
        assert data["last_payment_date"] == datetime.datetime(2023, 6, 10, 20, 21, 42, tzinfo=datetime.timezone.utc)

    def test_created(self):
        data = self.serializer(self.subscription).data
        assert data["created"] == datetime.datetime(2022, 6, 10, 20, 21, 42, tzinfo=datetime.timezone.utc)

    def test_last4(self):
        data = self.serializer(self.subscription).data
        assert data["last4"] == "7834"

    def test_card_expiration_date(self):
        data = self.serializer(self.subscription).data
        assert data["credit_card_expiration_date"] == "12/2022"

    def test_is_modifiable(self):
        data = self.serializer(self.subscription).data
        assert data["is_modifiable"] is True
        self.subscription.status = "unpaid"
        data = self.serializer(self.subscription).data
        assert data["is_modifiable"] is False

    def test_is_cancelable(self):
        data = self.serializer(self.subscription).data
        assert data["is_cancelable"] is False
        self.subscription.status = "active"
        data = self.serializer(self.subscription).data
        assert data["is_cancelable"] is True

    def test_interval(self):
        data = self.serializer(self.subscription).data
        assert data["interval"] == ContributionInterval.MONTHLY
        self.subscription.plan.interval = "year"
        self.subscription.plan.interval_count = 1
        data = self.serializer(self.subscription).data
        assert data["interval"] == ContributionInterval.YEARLY
        with raises(ValidationError):
            self.subscription.plan.interval_count = 2
            data = self.serializer(self.subscription).data

    def test_revenue_program_slug(self):
        data = self.serializer(self.subscription).data
        assert data["revenue_program_slug"] == "foo"
        with raises(ValidationError):
            del self.subscription.metadata
            data = self.serializer(self.subscription).data

    def test_amount(self):
        data = self.serializer(self.subscription).data
        assert data["amount"] == 1234

    def test_customer_id(self):
        data = self.serializer(self.subscription).data
        assert data["customer_id"] == "cus_1234"

    def test_payment_type(self):
        data = self.serializer(self.subscription).data
        assert data["payment_type"] == "card"
