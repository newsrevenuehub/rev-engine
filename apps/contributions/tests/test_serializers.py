import datetime
from datetime import timedelta
from unittest.mock import Mock

from django.conf import settings
from django.test import TestCase
from django.utils import timezone

import pydantic
import pydantic_core
import pytest
import stripe
from addict import Dict as AttrDict
from rest_framework.exceptions import APIException, PermissionDenied
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
from apps.contributions.serializers import ContributionSerializer, PortalContributionBaseSerializer
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.contributions.types import StripeMetadataSchemaBase, StripePaymentMetadataSchemaV1_4
from apps.contributions.utils import get_sha256_hash
from apps.pages.tests.factories import DonationPageFactory


@pytest.mark.django_db()
class TestContributionSerializer:
    def test_has_expected_fields(self, one_time_contribution):
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
        serialized = serializers.ContributionSerializer(instance=one_time_contribution)
        assert set(serialized.data.keys()) == set(expected_fields)

    @pytest.mark.parametrize(
        "make_serializer_object_fn",
        [
            lambda: Mock(flagged_date=timezone.now()),
            lambda: Mock(flagged_date=None),
        ],
    )
    def test_get_auto_accepted_on(self, make_serializer_object_fn):
        obj = make_serializer_object_fn()
        assert (
            ContributionSerializer().get_auto_accepted_on(obj) is None
            if not getattr(obj, "flagged_date", None)
            else obj.flagged_date + timedelta(settings.FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA)
        )

    @pytest.mark.parametrize(
        ("make_serializer_object_fn", "expected"),
        [
            (lambda: Mock(payment_provider_used=None), ""),
            (lambda: Mock(payment_provider_used=Mock(title=lambda: "something")), "something"),
        ],
    )
    def test_get_formatted_payment_provider_used(self, make_serializer_object_fn, expected):
        assert ContributionSerializer().get_formatted_payment_provider_used(make_serializer_object_fn()) == expected

    @pytest.mark.parametrize(
        ("make_serializer_object_fn", "expected"),
        [
            (lambda: Mock(provider_payment_id=None), ""),
            (
                lambda: Mock(provider_payment_id="<some-provider-payment-id>"),
                "<some-resource-url>/<some-provider-payment-id>",
            ),
        ],
    )
    def test_get_provider_payment_url(self, make_serializer_object_fn, expected, monkeypatch):
        resource_url = "<some-resource-url>"
        monkeypatch.setattr(
            "apps.contributions.serializers.ContributionSerializer._get_resource_url",
            lambda *args, **kwargs: resource_url,
        )
        assert ContributionSerializer().get_provider_payment_url(make_serializer_object_fn()) == expected

    @pytest.mark.parametrize(
        ("make_serializer_object_fn", "expected"),
        [
            (lambda: Mock(provider_subscription_id=None), ""),
            (
                lambda: Mock(provider_subscription_id="<some-provider-subscription-id>"),
                "<some-resource-url>/<some-provider-subscription-id>",
            ),
        ],
    )
    def test_get_provider_subscription_url(self, make_serializer_object_fn, expected, monkeypatch):
        resource_url = "<some-resource-url>"
        monkeypatch.setattr(
            "apps.contributions.serializers.ContributionSerializer._get_resource_url",
            lambda *args, **kwargs: resource_url,
        )
        assert ContributionSerializer().get_provider_subscription_url(make_serializer_object_fn()) == expected

    @pytest.mark.parametrize(
        ("make_serializer_object", "expected"),
        [
            (
                Mock(provider_customer_id="<some-provider-customer-id>"),
                "<some-resource-url>/<some-provider-customer-id>",
            ),
        ],
    )
    def test_get_provider_customer_url(self, make_serializer_object, expected, mocker, monkeypatch):
        resource_url = "<some-resource-url>"
        monkeypatch.setattr(
            "apps.contributions.serializers.ContributionSerializer._get_resource_url",
            lambda *args, **kwargs: resource_url,
        )

        assert ContributionSerializer().get_provider_customer_url(make_serializer_object) == expected

    def test__get_base_provider_url_when_payment_provider_used_not_stripe(self, mocker):
        """Here to get otherwise un-run object code running in tests."""

        class Klass:
            payment_provider_used = "not-stripe"

        assert ContributionSerializer()._get_base_provider_url(Klass()) is None

    def test__get_resource_url_when_no_provider_url(self, mocker):
        """Here to get otherwise un-run object code running in tests."""
        mocker.patch("apps.contributions.serializers.ContributionSerializer._get_base_provider_url", return_value=None)
        assert ContributionSerializer()._get_resource_url(None, None) == ""


class TestAbstractPaymentSerializer:
    def test_convert_amount_to_cents(self):
        assert serializers.AbstractPaymentSerializer().convert_amount_to_cents("1.2") == 120

    @pytest.mark.parametrize(
        ("data", "expected_amount"),
        [
            ({"amount": "1.2"}, 120),
            ({"amount": None}, None),
            ({"amount": "0.0"}, 0),
            ({"amount": "0"}, 0),
            ({"amount": "0.00"}, 0),
        ],
    )
    def test_to_internal_value(self, data, expected_amount, mocker):
        mock_super_to_internal_val = mocker.patch("rest_framework.serializers.Serializer.to_internal_value")
        serializers.AbstractPaymentSerializer().to_internal_value(data)
        mock_super_to_internal_val.assert_called_once_with({"amount": expected_amount})

    def test_validates_amount_min_max(self):
        amount = serializers.AbstractPaymentSerializer().fields["amount"]
        assert amount.min_value == serializers.REVENGINE_MIN_AMOUNT
        assert amount.max_value == serializers.STRIPE_MAX_AMOUNT
        assert {"max_value", "min_value"}.issubset(set(amount.error_messages.keys()))


@pytest.mark.django_db()
@pytest.fixture()
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
@pytest.fixture()
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
@pytest.fixture()
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
@pytest.fixture()
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
@pytest.fixture()
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
@pytest.fixture()
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
    """Choose donation page fixture via pytest.mark.parametrize convience function.

    Fixtures cannot be directly passed to pytest.mark.parametrize, but in some of our tests,
    it's quite convenient to be able to make page fixture choice parametrizable. Pytest fixtures have to be passed
    as params to a test in order to be in a usuable state at run time.

    This function gets passed a string value referring to a requested fixture, as well as a reference to fixtures passed as test
    call args, allowing us to yield the appropriate test fixture via parametrization.
    """
    return {
        "donation_page": donation_page,
        "donation_page_with_conditionally_required_phone_element": donation_page_with_conditionally_required_phone_element,
        "donation_page_with_conditionally_required_reason_for_giving_element_no_presets": donation_page_with_conditionally_required_reason_for_giving_element_no_presets,  # noqa E501 black formats it this way
        "donation_page_with_conditionally_required_reason_for_giving_element_and_presets": donation_page_with_conditionally_required_reason_for_giving_element_and_presets,  # noqa E501 black formats it this way
        "donation_page_with_unrequired_reason_for_giving_element_and_presets": donation_page_with_unrequired_reason_for_giving_element_and_presets,  # noqa E501 black formats it this way
        "donation_page_with_ask_honoree": donation_page_with_ask_honoree,
        "donation_page_with_ask_in_memory": donation_page_with_ask_in_memory,
    }[requested_fixture]


class MockBadActorResponseObjectNotBad:
    """Used in tests below to simulate response returned by make_bad_actor_request.

    See https://docs.pytest.org/en/7.1.x/how-to/monkeypatch.html for more info on how/why
    """

    mock_bad_actor_response_json = {"overall_judgment": settings.BAD_ACTOR_FLAG_SCORE - 1}

    @classmethod
    def json(cls):
        return cls.mock_bad_actor_response_json


class MockBadActorResponseObjectBad:
    """Used in tests below to simulate response returned by make_bad_actor_request.

    See https://docs.pytest.org/en/7.1.x/how-to/monkeypatch.html for more info on how/why
    """

    mock_bad_actor_response_json = {"overall_judgment": settings.BAD_ACTOR_FLAG_SCORE}

    @classmethod
    def json(cls):
        return cls.mock_bad_actor_response_json


class MockBadActorResponseObjectSuperBad:
    """Used in tests below to simulate response returned by make_bad_actor_request.

    See https://docs.pytest.org/en/7.1.x/how-to/monkeypatch.html for more info on how/why
    """

    mock_bad_actor_response_json = {"overall_judgment": settings.BAD_ACTOR_REJECT_SCORE}

    @classmethod
    def json(cls):
        return cls.mock_bad_actor_response_json


def mock_get_bad_actor(*args, **kwargs):
    return kwargs.get("response", MockBadActorResponseObjectNotBad)


def mock_get_bad_actor_raise_exception(*args, **kwargs):
    raise BadActorAPIError("Something bad happend")


def mock_stripe_call_with_error(*args, **kwargs):
    raise stripe.error.APIError("Something horrible has happened")


def mock_create_stripe_customer_with_exception(*args, **kwargs):
    raise stripe.error.APIError("Something horrible has happened")


@pytest.fixture()
def valid_swag_choices_string():
    choice_1_raw = f"t-shirt{StripePaymentMetadataSchemaV1_4.SWAG_SUB_CHOICE_DELIMITER}small"
    choice_2_raw = f"hat{StripePaymentMetadataSchemaV1_4.SWAG_SUB_CHOICE_DELIMITER}huge"
    return f"{choice_1_raw}{StripePaymentMetadataSchemaV1_4.SWAG_CHOICES_DELIMITER}{choice_2_raw}"


@pytest.fixture()
def invalid_swag_choices_string_exceed_max_length(valid_swag_choices_string, settings):
    assert settings.METADATA_MAX_SWAG_CHOICES_LENGTH
    invalid_string = ""
    while len(invalid_string) <= settings.METADATA_MAX_SWAG_CHOICES_LENGTH:
        invalid_string += valid_swag_choices_string
    return invalid_string


@pytest.mark.django_db()
class TestBaseCreatePaymentSerializer:
    serializer_class = serializers.BaseCreatePaymentSerializer

    @pytest.mark.parametrize(
        ("input_data", "requested_page", "expect_valid"),
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
        minimally_valid_contribution_form_data,
        donation_page,
        donation_page_with_conditionally_required_reason_for_giving_element_no_presets,
        donation_page_with_conditionally_required_reason_for_giving_element_and_presets,
        donation_page_with_unrequired_reason_for_giving_element_and_presets,
    ):
        data = minimally_valid_contribution_form_data | input_data
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
            assert set(serializer.errors.keys()) == {"reason_other"}
            assert serializer.errors["reason_other"][0] == GENERIC_BLANK

    @pytest.mark.parametrize(
        ("input_data", "requested_page", "expect_valid", "error_msg"),
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
        minimally_valid_contribution_form_data,
        requested_page,
        error_msg,
        donation_page,
        donation_page_with_conditionally_required_reason_for_giving_element_no_presets,
        donation_page_with_conditionally_required_reason_for_giving_element_and_presets,
        donation_page_with_unrequired_reason_for_giving_element_and_presets,
    ):
        """Test logic around reason_for_giving validation."""
        data = minimally_valid_contribution_form_data | input_data
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
            assert set(serializer.errors.keys()) == {"reason_for_giving"}
            assert serializer.errors["reason_for_giving"][0] == error_msg

    @pytest.mark.parametrize(
        ("input_data", "requested_page", "expect_valid"),
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
        minimally_valid_contribution_form_data,
    ):
        """Test logic around reason_for_giving validation.

        NB: For some of the parametrized scenarios, this test expects to find a validation error for
        "reason_other" instead of "reason_for_giving". We test that behavior as part of this test rather than
        elsewhere because "reason_for_giving" gets rewritten to be the value of "reason_other" via the
        `BaseCreatePaymentSerializer.resolve_reason_for_giving`, so the two fields are inter-related.
        """
        data = minimally_valid_contribution_form_data | input_data
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
            assert set(serializer.errors.keys()) == {"phone"}
            assert serializer.errors["phone"][0] == GENERIC_BLANK

    @pytest.mark.parametrize(
        ("input_data", "expect_valid"),
        [
            ({"tribute_type": "unexpected"}, False),
            ({"tribute_type": "type_honoree", "honoree": "Someone"}, True),
            ({"tribute_type": "type_in_memory_of", "in_memory_of": "Someone"}, True),
        ],
    )
    def test_validate_tribute_type(self, input_data, expect_valid, minimally_valid_contribution_form_data):
        data = minimally_valid_contribution_form_data | input_data
        serializer = self.serializer_class(data=data, context={"request": APIRequestFactory().post("")})
        assert serializer.is_valid() is expect_valid
        if expect_valid is False:
            assert set(serializer.errors.keys()) == {"tribute_type"}
            assert serializer.errors["tribute_type"][0] == GENERIC_UNEXPECTED_VALUE

    @pytest.mark.parametrize(
        ("input_data", "expect_valid"),
        [
            ({}, True),
            ({"tribute_type": "type_honoree", "honoree": ""}, False),
            ({"tribute_type": "type_honoree", "honoree": "Paul"}, True),
        ],
    )
    def test_validate_honoree(self, input_data, expect_valid, minimally_valid_contribution_form_data):
        """Show `honoree` cannot be blank when `tribute_type` is `type_honoree`."""
        data = minimally_valid_contribution_form_data | input_data
        serializer = self.serializer_class(data=data, context={"request": APIRequestFactory().post("")})
        assert serializer.is_valid() is expect_valid
        if expect_valid is False:
            assert set(serializer.errors.keys()) == {"honoree"}
            assert serializer.errors["honoree"][0] == GENERIC_BLANK

    @pytest.mark.parametrize(
        ("input_data", "expect_valid"),
        [
            ({}, True),
            ({"tribute_type": "type_in_memory_of", "in_memory_of": ""}, False),
            ({"tribute_type": "type_in_memory_of"}, False),
            ({"tribute_type": "type_in_memory_of", "in_memory_of": "Paul"}, True),
        ],
    )
    def test_validate_in_memory_of(self, input_data, expect_valid, minimally_valid_contribution_form_data):
        """Show `in_memory_of` cannot be blank when `tribute_type` is `type_in_memory_of`."""
        data = minimally_valid_contribution_form_data | input_data
        serializer = self.serializer_class(data=data, context={"request": APIRequestFactory().post("")})
        assert serializer.is_valid() is expect_valid
        if expect_valid is False:
            assert set(serializer.errors.keys()) == {"in_memory_of"}
            assert serializer.errors["in_memory_of"][0] == GENERIC_BLANK

    @pytest.mark.parametrize(
        ("input_data", "expected_resolved_value"),
        [
            ({"reason_for_giving": "Other", "reason_other": "My reason"}, "My reason"),
            ({"reason_for_giving": PRESET_REASONS[0]}, PRESET_REASONS[0]),
        ],
    )
    def test_validate_resolves_reason_for_giving(
        self,
        input_data,
        expected_resolved_value,
        minimally_valid_contribution_form_data,
        donation_page_with_unrequired_reason_for_giving_element_and_presets,
    ):
        """Show validation sets value of `reason_for_giving` to value of `reason_other` when initial value...

        ...for former is 'Other'.

        See note in BaseCreatePaymentSerializer.validate for explanation of why this happens in
        `validate`.
        """
        data = (
            minimally_valid_contribution_form_data
            | input_data
            | {"page": donation_page_with_unrequired_reason_for_giving_element_and_presets.id}
        )
        serializer = self.serializer_class(data=data, context={"request": APIRequestFactory().post("")})
        assert serializer.is_valid() is True
        assert serializer.validated_data["reason_for_giving"] == expected_resolved_value

    def test_get_bad_actor_score_happy_path(self, minimally_valid_contribution_form_data, monkeypatch):
        """Show that calling `get_bad_actor_score` returns response data.

        Note: `get_bad_actor` uses `BadActorSerializer` internally, which requires there to be an
        HTTP referer in the request, so that's why we set in request factory below.
        """
        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid() is True
        bad_actor_data = serializer.get_bad_actor_score(serializer.validated_data)
        assert bad_actor_data == MockBadActorResponseObjectNotBad.mock_bad_actor_response_json

    def test_get_bad_actor_score_when_data_invalid(self, minimally_valid_contribution_form_data, monkeypatch):
        """Show if the bad actor serialier data is invalid no exception is raise, but method returns None.

        We achieve an invalid state by omitting http referer from the request context
        """
        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        request = APIRequestFactory().post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid() is True
        bad_actor_data = serializer.get_bad_actor_score(serializer.validated_data)
        assert bad_actor_data is None

    def test_get_bad_actor_score_when_bad_actor_api_error(self, minimally_valid_contribution_form_data, monkeypatch):
        """Show if call to `make_bad_actor_request` in `get_bad_actor_score` results in BadActorAPIError, the.

        method call still succeeds, returning None.
        """
        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor_raise_exception)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid() is True
        bad_actor_data = serializer.get_bad_actor_score(serializer.validated_data)
        assert bad_actor_data is None

    @pytest.mark.parametrize(
        ("score", "should_flag"),
        [
            (settings.BAD_ACTOR_REJECT_SCORE, False),
            (settings.BAD_ACTOR_FLAG_SCORE, True),
            (settings.BAD_ACTOR_FLAG_SCORE - 1, False),
        ],
    )
    def test_should_flag(self, score, should_flag, minimally_valid_contribution_form_data):
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data)
        assert serializer.should_flag(score) is should_flag

    @pytest.mark.parametrize("interval", [ContributionInterval.MONTHLY, ContributionInterval.YEARLY])
    def test_build_contribution_happy_path(self, interval, minimally_valid_contribution_form_data, mocker):
        minimally_valid_contribution_form_data["interval"] = interval.value
        bad_actor_data = {"overall_judgment": settings.BAD_ACTOR_FLAG_SCORE - 1}
        contributor = ContributorFactory()
        serializer = self.serializer_class(
            data=minimally_valid_contribution_form_data, context={"request": APIRequestFactory().post("")}
        )
        assert serializer.is_valid() is True
        contribution = serializer.build_contribution(contributor, serializer.validated_data, bad_actor_data)
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

    def test_build_contribution_when_should_flag(self, minimally_valid_contribution_form_data):
        bad_actor_data = {"overall_judgment": settings.BAD_ACTOR_FLAG_SCORE}
        contributor = ContributorFactory()
        serializer = self.serializer_class(
            data=minimally_valid_contribution_form_data, context={"request": APIRequestFactory().post("")}
        )
        assert serializer.is_valid() is True
        contribution = serializer.build_contribution(contributor, serializer.validated_data, bad_actor_data)
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

    def test_build_contribution_when_should_reject(self, minimally_valid_contribution_form_data):
        bad_actor_data = {"overall_judgment": settings.BAD_ACTOR_REJECT_SCORE}
        contributor = ContributorFactory()
        serializer = self.serializer_class(
            data=minimally_valid_contribution_form_data, context={"request": APIRequestFactory().post("")}
        )
        assert serializer.is_valid() is True
        contribution = serializer.build_contribution(contributor, serializer.validated_data, bad_actor_data)
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

    def test_build_contribution_when_no_bad_actor_response(self, minimally_valid_contribution_form_data):
        bad_actor_data = None
        contributor = ContributorFactory()
        serializer = self.serializer_class(
            data=minimally_valid_contribution_form_data, context={"request": APIRequestFactory().post("")}
        )
        assert serializer.is_valid() is True
        contribution = serializer.build_contribution(contributor, serializer.validated_data, bad_actor_data)
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

    def test_donation_page_when_element_not_have_required_fields(
        self, donation_page, minimally_valid_contribution_form_data
    ):
        del donation_page.elements[0]["requiredFields"]
        donation_page.save()
        request = APIRequestFactory().post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid()

    def test_generate_stripe_metadata_when_v1_4(
        self, minimally_valid_contribution_form_data, valid_swag_choices_string
    ):
        assert settings.METADATA_SCHEMA_VERSION_1_4
        minimally_valid_contribution_form_data["swag_choices"] = valid_swag_choices_string
        contribution = ContributionFactory(donation_page_id=minimally_valid_contribution_form_data["page"])
        request = APIRequestFactory(HTTP_REFERER=(referer := "https://www.google.com")).post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        metadata = serializer.generate_stripe_metadata(contribution)
        assert isinstance(metadata, StripePaymentMetadataSchemaV1_4)
        assert metadata.agreed_to_pay_fees == minimally_valid_contribution_form_data["agreed_to_pay_fees"]
        assert metadata.referer == pydantic_core.Url(referer)
        assert metadata.swag_choices == valid_swag_choices_string
        assert metadata.schema_version == "1.4"
        assert metadata.source == "rev-engine"
        assert metadata.contributor_id == str(contribution.contributor.id)
        assert metadata.donor_selected_amount == minimally_valid_contribution_form_data["donor_selected_amount"]
        assert metadata.revenue_program_id == str(contribution.revenue_program.id)
        assert metadata.revenue_program_slug == contribution.revenue_program.slug
        assert (
            metadata.swag_opt_out is False
        )  # not provided in form data, this is default via default def in serializer field def
        optional_fields_defaulting_to_none = (
            "comp_subscription",
            "company_name",
            "honoree",
            "in_memory_of",
            "reason_for_giving",
            "sf_campaign_id",
        )
        for x in optional_fields_defaulting_to_none:
            assert getattr(metadata, x) is None


@pytest.fixture()
def valid_stripe_metadata_v1_4_data():
    return {
        "agreed_to_pay_fees": True,
        "contributor_id": "1",
        "donor_selected_amount": 1000.0,
        "referer": "https://www.google.com",
        "revenue_program_id": "1",
        "revenue_program_slug": "revenue-program-slug",
        "swag_choices": "",
        "schema_version": "1.4",
        "source": "rev-engine",
    }


class TestStripePaymentMetadataSchemaV1_4:
    @pytest.mark.parametrize(
        "value",
        [
            "",
            "foo:bar",
            "foo:bar;bizz:bang",
            "foo:bar;",
            "foo",
            "foo;",
            "foo:bar;bizz",
            "bizz;foo:bar",
            "foo2:bar",
            "1foo:bar",
            "fo-o:bar",
            # the following cases are unexpected, but allowed for now so adding to make clear they get through
            ";",
            ";foo:bar",
        ],
    )
    def test_with_valid_swag_choices_values(self, value, valid_stripe_metadata_v1_4_data):
        instance = StripePaymentMetadataSchemaV1_4(**(valid_stripe_metadata_v1_4_data | {"swag_choices": value}))
        assert instance.swag_choices == value

    @pytest.mark.parametrize(
        "value",
        [
            ":",
            ":bar",
            ":bar;",
            "foo:",
            "foo ",
            " foo ",
            "foo : bar ; bizz : bang",
            "foo : bar ; bizz : bang ;",
            "foo: bar ;",
            "f oo",
            "fo'o:bar",
            "foo:bar\n",
        ],
    )
    def test_with_invalid_swag_choices_value(self, value, valid_stripe_metadata_v1_4_data):
        with pytest.raises(pydantic.ValidationError):
            StripePaymentMetadataSchemaV1_4(**(valid_stripe_metadata_v1_4_data | {"swag_choices": value}))

    def test_with_invalid_swag_choices_when_exceed_max_length(
        self, valid_stripe_metadata_v1_4_data, invalid_swag_choices_string_exceed_max_length
    ):
        with pytest.raises(pydantic.ValidationError):
            StripePaymentMetadataSchemaV1_4(
                **(valid_stripe_metadata_v1_4_data | {"swag_choices": invalid_swag_choices_string_exceed_max_length})
            )

    def test_converts_id_to_string(self, valid_stripe_metadata_v1_4_data):
        # Note the reason for existence of this conversion and test is that in test env, contributor_id and revenue_program_id
        # will be an int, but in prod will be a string. We want to strictly type to string, so we convert in validation
        # step in class.
        valid_stripe_metadata_v1_4_data["contributor_id"] = (con_id := 1)
        valid_stripe_metadata_v1_4_data["revenue_program_id"] = (rp_id := 1)
        instance = StripePaymentMetadataSchemaV1_4(**valid_stripe_metadata_v1_4_data)
        assert instance.contributor_id == str(con_id)
        assert instance.revenue_program_id == str(rp_id)

    def test_keeps_contributor_id_as_none_when_none(self, valid_stripe_metadata_v1_4_data):
        valid_stripe_metadata_v1_4_data["contributor_id"] = None
        instance = StripePaymentMetadataSchemaV1_4(**valid_stripe_metadata_v1_4_data)
        assert instance.contributor_id is None


@pytest.mark.django_db()
class TestCreateOneTimePaymentSerializer:
    serializer_class = serializers.CreateOneTimePaymentSerializer

    def test_is_subclass_of_BaseCreatePaymentSerializer(self):
        """Prove that CreateOneTimePaymentSerializer is a subclass of BaseCreatePaymentSerializer.

        This is so the testing of the parent class' behavior accrues to the child.
        """
        assert issubclass(self.serializer_class, serializers.BaseCreatePaymentSerializer)

    def test_happy_path(self, monkeypatch, minimally_valid_contribution_form_data, mocker):
        """Demonstrate happy path when of `.create`.

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

        save_spy = mocker.spy(Contributor, "save")

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        mock_create_stripe_customer = mocker.patch("apps.contributions.models.Contribution.create_stripe_customer")
        mock_create_stripe_customer.return_value = AttrDict({"id": (fake_customer_id := "fake-customer-id")})

        mock_create_stripe_one_time_payment_intent = mocker.patch(
            "apps.contributions.models.Contribution.create_stripe_one_time_payment_intent"
        )
        mock_create_stripe_one_time_payment_intent.return_value = AttrDict(
            {
                "id": "<some-payment-intent-id>",
            }
        )
        mock_create_stripe_one_time_payment_intent.return_value = AttrDict(
            {
                "id": (pi_id := "some payment intent id"),
                "client_secret": (client_secret := "shhhhhhh!"),
                "customer": fake_customer_id,
            }
        )
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid()
        result = serializer.create(serializer.validated_data)
        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert set(result.keys()) == {"client_secret", "uuid", "email_hash"}
        assert result["client_secret"] == client_secret
        assert Contributor.objects.filter(email=minimally_valid_contribution_form_data["email"]).exists()
        contribution = Contribution.objects.get(uuid=result["uuid"])
        assert result["uuid"] == str(contribution.uuid)
        assert result["email_hash"] == get_sha256_hash(contribution.contributor.email)
        assert contribution.status == ContributionStatus.PROCESSING
        assert contribution.flagged_date is None
        assert contribution.bad_actor_response == MockBadActorResponseObjectNotBad.mock_bad_actor_response_json
        assert contribution.contribution_metadata is not None
        assert contribution.provider_customer_id == fake_customer_id
        assert contribution.provider_payment_id == pi_id
        save_spy.assert_called_once()

    def test_when_stripe_errors_creating_payment_intent(
        self, minimally_valid_contribution_form_data, monkeypatch, mocker
    ):
        """Demonstrate `.create` when there's a Stripe error when creating payment intent.

        A contributor and contribution should still be created as in happy path, but a GenericPaymentError should
        be raised.

        """
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        save_spy = mocker.spy(Contributor, "save")

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)

        mock_create_stripe_customer = mocker.patch("apps.contributions.models.Contribution.create_stripe_customer")
        mock_create_stripe_customer.return_value = AttrDict({"id": (fake_customer_id := "fake-customer-id")})

        mock_create_stripe_one_time_payment_intent = mocker.patch(
            "apps.contributions.models.Contribution.create_stripe_one_time_payment_intent"
        )
        mock_create_stripe_one_time_payment_intent.side_effect = stripe.error.StripeError("Stripe error")

        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")

        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})

        assert serializer.is_valid()
        with pytest.raises(serializers.GenericPaymentError):
            serializer.create(serializer.validated_data)

        assert Contributor.objects.count() == contributor_count + 1
        assert Contribution.objects.count() == contribution_count + 1

        assert Contributor.objects.filter(email=minimally_valid_contribution_form_data["email"]).exists()
        contributor = Contributor.objects.get(email=minimally_valid_contribution_form_data["email"])
        assert contributor.contribution_set.count() == 1
        contribution = contributor.contribution_set.first()
        assert contribution.provider_customer_id == fake_customer_id
        assert contribution.status == ContributionStatus.PROCESSING
        assert contribution.flagged_date is None
        assert contribution.bad_actor_response == MockBadActorResponseObjectNotBad.mock_bad_actor_response_json
        assert contribution.contribution_metadata is not None
        assert contribution.provider_customer_id == fake_customer_id
        assert contribution.provider_payment_id is None

        save_spy.assert_called_once()

    def test_when_stripe_errors_creating_customer(self, minimally_valid_contribution_form_data, monkeypatch, mocker):
        """Demonstrate `.create` when there's a Stripe error when creating customer.

        A contributor and contribution should still be created as in happy path, but a GenericPaymentError should
        be raised.
        """
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        save_spy = mocker.spy(Contributor, "save")

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        monkeypatch.setattr(
            "apps.contributions.models.Contribution.create_stripe_customer", mock_stripe_call_with_error
        )

        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")

        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})

        assert serializer.is_valid()

        with pytest.raises(serializers.GenericPaymentError):
            serializer.create(serializer.validated_data)

        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert Contributor.objects.filter(email=minimally_valid_contribution_form_data["email"]).exists()
        contributor = Contributor.objects.get(email=minimally_valid_contribution_form_data["email"])
        assert contributor.contribution_set.count() == 1
        contribution = contributor.contribution_set.first()
        assert contribution.status == ContributionStatus.PROCESSING
        assert contribution.flagged_date is None
        assert contribution.bad_actor_response == MockBadActorResponseObjectNotBad.mock_bad_actor_response_json
        assert contribution.contribution_metadata is None
        assert contribution.provider_customer_id is None
        assert contribution.provider_payment_id is None

        save_spy.assert_called_once()

    def test_when_contribution_is_flagged(self, minimally_valid_contribution_form_data, monkeypatch, mocker):
        """Demonstrate `.create` when the contribution gets flagged.

        A contributor, contribution, and Stripe entities should still be created as in happy path, but the `capture_method` on
        the PaymentIntent should be "manual"
        """
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        save_spy = mocker.spy(Contributor, "save")

        monkeypatch.setattr(
            "apps.contributions.serializers.make_bad_actor_request",
            lambda x: mock_get_bad_actor(response=MockBadActorResponseObjectBad),
        )
        mock_create_stripe_customer = Mock()
        fake_customer_id = "fake-customer-id"
        mock_create_stripe_customer.return_value = AttrDict({"id": fake_customer_id})
        monkeypatch.setattr("stripe.Customer.create", mock_create_stripe_customer)

        mock_create_stripe_one_time_payment_intent = Mock()
        client_secret = "shhhhhhh!"
        pi_id = "some payment intent id"
        mock_create_stripe_one_time_payment_intent.return_value = AttrDict(
            {
                "id": pi_id,
                "client_secret": client_secret,
                "customer": fake_customer_id,
            }
        )
        monkeypatch.setattr("stripe.PaymentIntent.create", mock_create_stripe_one_time_payment_intent)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid()
        result = serializer.create(serializer.validated_data)
        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert set(result.keys()) == {"client_secret", "email_hash", "uuid"}
        assert result["client_secret"] == client_secret
        assert Contributor.objects.filter(email=minimally_valid_contribution_form_data["email"]).exists()
        contribution = Contribution.objects.get(uuid=result["uuid"])
        assert result["email_hash"] == get_sha256_hash(contribution.contributor.email)
        assert contribution.status == ContributionStatus.FLAGGED
        assert contribution.flagged_date is not None
        assert contribution.bad_actor_response == MockBadActorResponseObjectBad.mock_bad_actor_response_json
        assert contribution.provider_payment_id == pi_id
        assert contribution.contribution_metadata is not None
        assert contribution.provider_customer_id == fake_customer_id

        mock_create_stripe_customer.assert_called_once()

        call_args = mock_create_stripe_one_time_payment_intent.call_args[1]
        # this is nested, and not necessary to test here
        call_args.pop("metadata", None)
        assert call_args == {
            "amount": contribution.amount,
            "currency": contribution.currency,
            "customer": contribution.provider_customer_id,
            "statement_descriptor_suffix": None,
            "stripe_account": contribution.revenue_program.payment_provider.stripe_account_id,
            "capture_method": "manual",
        }
        save_spy.assert_called_once()

    def test_when_contribution_is_rejected(self, minimally_valid_contribution_form_data, monkeypatch, mocker):
        """Demonstrate `.create` when the contribution gets flagged.

        A contributor and contribution should still be created as in happy path, but a PermissionDenied error should occur, and
        a Stripe payment intent should not be created.
        """
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        save_spy = mocker.spy(Contributor, "save")

        monkeypatch.setattr(
            "apps.contributions.serializers.make_bad_actor_request",
            lambda x: mock_get_bad_actor(response=MockBadActorResponseObjectSuperBad),
        )
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid()
        with pytest.raises(PermissionDenied):
            serializer.create(serializer.validated_data)

        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert Contributor.objects.filter(email=minimally_valid_contribution_form_data["email"]).exists()
        contributor = Contributor.objects.get(email=minimally_valid_contribution_form_data["email"])
        assert contributor.contribution_set.count() == 1
        contribution = contributor.contribution_set.first()
        assert contribution.status == ContributionStatus.REJECTED
        assert contribution.flagged_date is None
        assert contribution.provider_customer_id is None
        assert contribution.provider_payment_id is None
        assert contribution.contribution_metadata is None
        assert contribution.bad_actor_response == MockBadActorResponseObjectSuperBad.mock_bad_actor_response_json
        assert contribution.provider_customer_id is None
        assert contribution.provider_payment_id is None

        save_spy.assert_called_once()

    def test_create_when_value_error_creating_metadata(self, minimally_valid_contribution_form_data, mocker):
        minimally_valid_contribution_form_data["interval"] = ContributionInterval.ONE_TIME.value
        mocker.patch(
            "apps.contributions.models.Contribution.create_stripe_customer", return_value=AttrDict({"id": "fake-id"})
        )
        mocker.patch(
            "apps.contributions.serializers.BaseCreatePaymentSerializer.generate_stripe_metadata",
            side_effect=ValueError("Not valid"),
        )
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        # DRF serializer validation is separate from the pydantic validation of metadata
        assert serializer.is_valid() is True
        with pytest.raises(APIException):
            serializer.create(serializer.validated_data)


@pytest.mark.django_db()
class TestCreateRecurringPaymentSerializer:
    serializer_class = serializers.CreateRecurringPaymentSerializer

    def test_is_subclass_of_BaseCreatePaymentSerializer(self):
        """Prove that CreateRecurringPaymentSerializer is a subclass of BaseCreatePaymentSerializer.

        This is so the testing of the parent class' behavior accrues to the child.
        """
        assert issubclass(self.serializer_class, serializers.BaseCreatePaymentSerializer)

    @pytest.mark.parametrize("interval", ["month", "year"])
    def test_create_happy_path(self, monkeypatch, minimally_valid_contribution_form_data, interval, mocker):
        """Demonstrate happy path when of `.create`.

        Namely, it should:

        - create a contributor
        - create a contribution that has contribution_metadata
        - add bad actor score to contribution
        - not flag the contribution
        - create a Stripe Customer
        - create a Stripe Subscription
        """
        # ensure we have right contribution_metadata, and that right method gets called
        save_spy = mocker.spy(Contribution, "save")

        data = minimally_valid_contribution_form_data | {"interval": interval}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        mock_create_stripe_subscription = mocker.patch(
            "apps.contributions.models.Contribution.create_stripe_subscription"
        )
        mock_create_stripe_subscription.return_value = AttrDict(
            {
                "id": "some payment intent id",
                "latest_invoice": {
                    "payment_intent": {
                        "client_secret": (client_secret := "<some-client-secret>"),
                        "id": "pi_fakefakefake",
                    }
                },
                "customer": (fake_customer_id := "fake-customer-id"),
            }
        )

        mock_create_stripe_customer = mocker.patch("apps.contributions.models.Contribution.create_stripe_customer")
        mock_create_stripe_customer.return_value = AttrDict({"id": fake_customer_id})

        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=data, context={"request": request})

        assert serializer.is_valid()

        result = serializer.create(serializer.validated_data)
        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert set(result.keys()) == {"client_secret", "email_hash", "uuid"}
        assert result["client_secret"] == client_secret
        assert Contributor.objects.filter(email=minimally_valid_contribution_form_data["email"]).exists()
        contribution = Contribution.objects.get(uuid=result["uuid"])
        assert result["email_hash"] == get_sha256_hash(contribution.contributor.email)
        assert contribution.status == ContributionStatus.PROCESSING
        assert contribution.flagged_date is None
        assert contribution.bad_actor_response == MockBadActorResponseObjectNotBad.mock_bad_actor_response_json
        assert contribution.provider_subscription_id == mock_create_stripe_subscription.return_value["id"]
        assert contribution.contribution_metadata is not None

        save_spy.assert_called_once()

    def test_create_when_stripe_errors_creating_subscription(
        self, minimally_valid_contribution_form_data, monkeypatch, mocker
    ):
        """Demonstrate `.create` when there's a Stripe error when creating subscription.

        A contributor and contribution should still be created as in happy path, but a GenericPaymentError should
        be raised, and no Stripe subscription created.
        """
        save_spy = mocker.spy(Contribution, "save")
        data = minimally_valid_contribution_form_data | {"interval": "month"}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        monkeypatch.setattr("apps.contributions.serializers.make_bad_actor_request", mock_get_bad_actor)
        mock_create_stripe_customer = Mock()
        mock_create_stripe_customer.return_value = AttrDict({"id": "some id"})
        monkeypatch.setattr("stripe.Customer.create", mock_create_stripe_customer)
        monkeypatch.setattr("apps.contributions.models.stripe.Subscription.create", mock_stripe_call_with_error)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")

        serializer = self.serializer_class(data=data, context={"request": request})

        assert serializer.is_valid()
        with pytest.raises(serializers.GenericPaymentError):
            serializer.create(serializer.validated_data)

        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert Contributor.objects.filter(email=minimally_valid_contribution_form_data["email"]).exists()
        contributor = Contributor.objects.get(email=minimally_valid_contribution_form_data["email"])
        assert contributor.contribution_set.count() == 1
        contribution = contributor.contribution_set.first()

        assert contribution.status == ContributionStatus.PROCESSING
        assert contribution.provider_customer_id == mock_create_stripe_customer.return_value["id"]
        assert contribution.provider_subscription_id is None

        assert contribution.contribution_metadata is not None

        save_spy.assert_called_once()

    def test_create_when_stripe_errors_creating_customer(
        self, monkeypatch, minimally_valid_contribution_form_data, mocker
    ):
        """Demonstrate `.create` when there's a Stripe error when creating customer.

        A contributor and contribution should still be created as in happy path, but a GenericPaymentError should
        be raised.
        """
        save_spy = mocker.spy(Contribution, "save")
        data = minimally_valid_contribution_form_data | {"interval": "month"}
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
        assert Contributor.objects.filter(email=minimally_valid_contribution_form_data["email"]).exists()
        contributor = Contributor.objects.get(email=minimally_valid_contribution_form_data["email"])
        assert contributor.contribution_set.count() == 1
        contribution = contributor.contribution_set.first()
        assert contribution.status == ContributionStatus.PROCESSING
        assert contribution.provider_customer_id is None
        assert contribution.provider_subscription_id is None

        assert contribution.contribution_metadata is not None
        save_spy.assert_called_once()

    def test_create_when_contribution_is_flagged(self, minimally_valid_contribution_form_data, monkeypatch, mocker):
        """Demonstrate `.create` when the contribution gets flagged.

        All entities created in happy path should be created here, but the status on contribution should
        be "flagged" and the subscription should have a trial.
        """
        save_spy = mocker.spy(Contribution, "save")
        data = minimally_valid_contribution_form_data | {"interval": "month"}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()
        monkeypatch.setattr(
            "apps.contributions.serializers.make_bad_actor_request",
            lambda x: mock_get_bad_actor(response=MockBadActorResponseObjectBad),
        )
        mock_create_stripe_customer = Mock()
        fake_customer_id = "fake-customer-id"
        mock_create_stripe_customer.return_value = AttrDict({"id": fake_customer_id})
        monkeypatch.setattr("stripe.Customer.create", mock_create_stripe_customer)
        mock_setup_intent_create = Mock()
        client_secret = "shhhhhhh!"
        setup_intent_id = "some-sub-id"
        payment_method_id = "some-payment-id"
        mock_setup_intent_create.return_value = AttrDict(
            {
                "id": setup_intent_id,
                "client_secret": client_secret,
                "payment_method": payment_method_id,
            }
        )
        monkeypatch.setattr("stripe.SetupIntent.create", mock_setup_intent_create)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=data, context={"request": request})

        assert serializer.is_valid()
        serializer.create(serializer.validated_data)
        assert Contribution.objects.count() == contribution_count + 1
        assert Contributor.objects.count() == contributor_count + 1
        assert Contributor.objects.filter(email=minimally_valid_contribution_form_data["email"]).exists()
        contributor = Contributor.objects.get(email=minimally_valid_contribution_form_data["email"])
        assert contributor.contribution_set.count() == 1
        contribution = contributor.contribution_set.first()
        assert contribution.status == ContributionStatus.FLAGGED
        assert contribution.flagged_date is not None
        assert contribution.provider_subscription_id is None
        assert contribution.provider_setup_intent_id == setup_intent_id
        save_spy.assert_called_once()

    def test_create_when_contribution_is_rejected(self, minimally_valid_contribution_form_data, monkeypatch, mocker):
        """Demonstrate `.create` when the contribution gets flagged.

        A contributor and contribution should still be created as in happy path, but a PermissionDenied error should occur, and
        a Stripe subscription should not be created.
        """
        save_spy = mocker.spy(Contribution, "save")
        data = minimally_valid_contribution_form_data | {"interval": "month"}
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
        assert Contributor.objects.filter(email=minimally_valid_contribution_form_data["email"]).exists()
        contributor = Contributor.objects.get(email=minimally_valid_contribution_form_data["email"])
        assert contributor.contribution_set.count() == 1
        contribution = contributor.contribution_set.first()
        assert contribution.status == ContributionStatus.REJECTED
        assert contribution.flagged_date is None
        assert contribution.provider_subscription_id is None
        assert contribution.provider_customer_id is None

        assert contribution.contribution_metadata is None
        save_spy.assert_called_once()

    def test_create_when_value_error_creating_metadata(self, minimally_valid_contribution_form_data, mocker):
        minimally_valid_contribution_form_data["interval"] = ContributionInterval.MONTHLY.value
        mocker.patch(
            "apps.contributions.models.Contribution.create_stripe_customer", return_value=AttrDict({"id": "fake-id"})
        )
        mocker.patch(
            "apps.contributions.serializers.BaseCreatePaymentSerializer.generate_stripe_metadata",
            side_effect=ValueError("Not valid"),
        )
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        # DRF serializer validation is separate from the pydantic validation of metadata
        assert serializer.is_valid() is True
        with pytest.raises(APIException):
            serializer.create(serializer.validated_data)


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
            assert field in data

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
        self.subscription.plan.interval_count = 2
        with pytest.raises(ValidationError):
            self.serializer(self.subscription).data  # noqa: B018 Ruff doesn't understand this is
            # a property and accessing it has side effects we are testing.

    def test_revenue_program_slug(self):
        data = self.serializer(self.subscription).data
        assert data["revenue_program_slug"] == "foo"
        del self.subscription.metadata
        with pytest.raises(ValidationError):
            self.serializer(self.subscription).data  # noqa: B018 Ruff doesn't understand this is
            # a property and accessing it has side effects we are testing.

    def test_amount(self):
        data = self.serializer(self.subscription).data
        assert data["amount"] == 1234

    def test_customer_id(self):
        data = self.serializer(self.subscription).data
        assert data["customer_id"] == "cus_1234"

    def test_payment_type(self):
        data = self.serializer(self.subscription).data
        assert data["payment_type"] == "card"


class TestStripeMetadataSchemaBase:
    @pytest.mark.parametrize(
        ("value", "expected"),
        [
            (True, True),
            (False, False),
            (None, None),
            ("false", False),
            ("none", False),
            ("no", False),
            ("n", False),
            ("true", True),
            ("yes", True),
            ("y", True),
            ("FALSE", False),
            ("NONE", False),
            ("NO", False),
            ("N", False),
            ("TRUE", True),
            ("YES", True),
            ("Y", True),
            ("tRuE", True),
            ("faLSE", False),
            ("nOnE", False),
            ("nO", False),
            ("yEs", True),
            (" false ", False),
            (" true ", True),
        ],
    )
    def test_normalize_boolean_happy_path(self, value, expected):
        assert StripeMetadataSchemaBase.normalize_boolean(value) == expected

    @pytest.mark.parametrize("value", [0, 1, 2, "0", "1", "cats", [], ["True"]])
    def test_normalize_boolean_when_value_is_not_valid_type(self, value):
        with pytest.raises(ValueError, match="Value must be a boolean, None, or castable string"):
            StripeMetadataSchemaBase.normalize_boolean(value)


class TestPortalContributionBaseSerializer:
    @pytest.mark.parametrize(
        ("method", "kwargs"),
        [
            ("create", {"validated_data": {}}),
            ("delete", {"instance": None}),
            ("update", {"instance": None, "validated_data": {}}),
        ],
    )
    def test_unsupported_methods(self, method, kwargs):
        with pytest.raises(NotImplementedError):
            getattr(PortalContributionBaseSerializer(), method)(**kwargs)
