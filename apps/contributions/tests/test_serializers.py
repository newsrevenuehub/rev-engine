from datetime import timedelta
from unittest.mock import Mock

from django.conf import settings
from django.utils import timezone

import pydantic
import pytest
import stripe
from addict import Dict as AttrDict
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from rest_framework.test import APIRequestFactory

from apps.api.error_messages import GENERIC_BLANK, GENERIC_UNEXPECTED_VALUE
from apps.contributions import serializers
from apps.contributions.bad_actor import BadActorAPIError
from apps.contributions.choices import BadActorAction
from apps.contributions.models import (
    Contribution,
    ContributionInterval,
    ContributionStatus,
    Contributor,
)
from apps.contributions.serializers import (
    PAYMENT_PAID,
    PAYMENT_REFUNDED,
    ContributionSerializer,
    PortalContributionBaseSerializer,
    PortalContributionDetailSerializer,
    SwitchboardPaymentSerializer,
)
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory, PaymentFactory
from apps.contributions.tests.test_models import MockSubscription
from apps.contributions.typings import StripeMetadataSchemaBase, StripePaymentMetadataSchemaV1_4
from apps.contributions.utils import get_sha256_hash
from apps.pages.tests.factories import DonationPageFactory


@pytest.fixture
def bad_actor_good_response(mocker, bad_actor_good_score):
    return mocker.patch(
        "apps.contributions.serializers.get_bad_actor_score",
        return_value=bad_actor_good_score,
    )


@pytest.fixture
def bad_actor_bad_response(mocker, bad_actor_bad_score):
    return mocker.patch(
        "apps.contributions.serializers.get_bad_actor_score",
        return_value=bad_actor_bad_score,
    )


@pytest.fixture
def bad_actor_super_bad_response(mocker, bad_actor_super_bad_score):
    return mocker.patch(
        "apps.contributions.serializers.get_bad_actor_score",
        return_value=bad_actor_super_bad_score,
    )


@pytest.fixture
def get_bad_actor_score_causes_uncaught(mocker):
    class RandomException(Exception):
        pass

    return mocker.patch(
        "apps.contributions.serializers.get_bad_actor_score",
        side_effect=RandomException("Something bad happened"),
    )


@pytest.mark.django_db
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
            "first_payment_date",
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
        # In real life, this serializer is called by ContributionsViewSet, which
        # annotates its queryset with first_payment_date.
        # test_retrieve_when_expected_non_contributor_user in test_views.py
        # checks that.
        serialized = serializers.ContributionSerializer(
            instance=Contribution.objects.all().with_first_payment_date().filter(id=one_time_contribution.id).first()
        )
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


@pytest.mark.django_db
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


@pytest.mark.django_db
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


@pytest.mark.django_db
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


@pytest.mark.django_db
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


@pytest.mark.django_db
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


@pytest.mark.django_db
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


class MockBadActorResponseObjectNotBad:
    """Used in tests below to simulate response returned by get_bad_actor_score.

    See https://docs.pytest.org/en/7.1.x/how-to/monkeypatch.html for more info on how/why
    """

    mock_bad_actor_response_json = {"overall_judgment": settings.BAD_ACTOR_FLAG_SCORE - 1, "items": []}

    @classmethod
    def json(cls):
        return cls.mock_bad_actor_response_json


class MockBadActorResponseObjectBad:
    """Used in tests below to simulate response returned by get_bad_actor_score.

    See https://docs.pytest.org/en/7.1.x/how-to/monkeypatch.html for more info on how/why
    """

    mock_bad_actor_response_json = {"overall_judgment": settings.BAD_ACTOR_FLAG_SCORE, "items": []}

    @classmethod
    def json(cls):
        return cls.mock_bad_actor_response_json


class MockBadActorResponseObjectSuperBad:
    """Used in tests below to simulate response returned by get_bad_actor_score.

    See https://docs.pytest.org/en/7.1.x/how-to/monkeypatch.html for more info on how/why
    """

    mock_bad_actor_response_json = {"overall_judgment": settings.BAD_ACTOR_REJECT_SCORE, "items": []}

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


@pytest.fixture
def valid_swag_choices_string():
    choice_1_raw = f"t-shirt{StripePaymentMetadataSchemaV1_4.SWAG_SUB_CHOICE_DELIMITER}small"
    choice_2_raw = f"hat{StripePaymentMetadataSchemaV1_4.SWAG_SUB_CHOICE_DELIMITER}huge"
    return f"{choice_1_raw}{StripePaymentMetadataSchemaV1_4.SWAG_CHOICES_DELIMITER}{choice_2_raw}"


@pytest.fixture
def invalid_swag_choices_string_exceed_max_length(valid_swag_choices_string, settings):
    assert settings.METADATA_MAX_SWAG_CHOICES_LENGTH
    invalid_string = ""
    while len(invalid_string) <= settings.METADATA_MAX_SWAG_CHOICES_LENGTH:
        invalid_string += valid_swag_choices_string
    return invalid_string


@pytest.mark.django_db
class TestBaseCreatePaymentSerializer:
    serializer_class = serializers.BaseCreatePaymentSerializer

    @pytest.mark.parametrize(
        ("input_data", "page_fixture", "expect_valid", "error_msg"),
        [
            (
                {},
                "donation_page_with_conditionally_required_reason_for_giving_element_no_presets",
                False,
                GENERIC_BLANK,
            ),
            (
                {"reason_for_giving": "Not a preset reason"},
                "donation_page_with_conditionally_required_reason_for_giving_element_and_presets",
                True,
                None,
            ),
            ({}, "donation_page_with_unrequired_reason_for_giving_element_and_presets", True, None),
            (
                {"reason_for_giving": "Not a preset reason"},
                "donation_page_with_unrequired_reason_for_giving_element_and_presets",
                True,
                None,
            ),
        ],
    )
    def test_validate_reason_for_giving(
        self, input_data, expect_valid, minimally_valid_contribution_form_data, page_fixture, error_msg, request
    ):
        """Test logic around reason_for_giving validation."""
        data = minimally_valid_contribution_form_data | input_data
        data["page"] = request.getfixturevalue(page_fixture).id
        serializer = self.serializer_class(data=data, context={"request": APIRequestFactory().post("")})
        assert serializer.is_valid() is expect_valid
        if expect_valid is False:
            assert set(serializer.errors.keys()) == {"reason_for_giving"}
            assert serializer.errors["reason_for_giving"][0] == error_msg

    @pytest.mark.parametrize(
        ("input_data", "page_fixture", "expect_valid"),
        [
            ({"phone": ""}, "donation_page", True),
            ({"phone": "something"}, "donation_page", True),
            ({"phone": ""}, "donation_page_with_conditionally_required_phone_element", False),
            ({"phone": "something"}, "donation_page_with_conditionally_required_phone_element", True),
        ],
    )
    def test_validate_phone(
        self, input_data, page_fixture, expect_valid, minimally_valid_contribution_form_data, request
    ):
        data = minimally_valid_contribution_form_data | input_data
        data["page"] = request.getfixturevalue(page_fixture).id
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

    def test_get_bad_actor_score_fields(self, minimally_valid_contribution_form_data, mocker):
        """Show that calling `get_bad_actor_score` returns response data.

        Note: `get_bad_actor` uses `BadActorSerializer` internally, which requires there to be an
        HTTP referer in the request, so that's why we set in request factory below.
        """
        mock_get_bad_actor_score = mocker.patch("apps.contributions.serializers.get_bad_actor_score")
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid() is True
        serializer.get_bad_actor_score(serializer.validated_data, action=BadActorAction.CONTRIBUTION.value)
        assert mock_get_bad_actor_score.call_count == 1
        assert mock_get_bad_actor_score.call_args[0][0]["action"] == "contribution"
        assert mock_get_bad_actor_score.call_args[0][0]["org"] == f'{serializer.validated_data["page"].organization.id}'
        assert mock_get_bad_actor_score.call_args[0][0]["amount"] == f'{serializer.validated_data["amount"]}'
        assert mock_get_bad_actor_score.call_args[0][0]["first_name"] == serializer.validated_data["first_name"]
        assert mock_get_bad_actor_score.call_args[0][0]["last_name"] == serializer.validated_data["last_name"]
        assert mock_get_bad_actor_score.call_args[0][0]["email"] == serializer.validated_data["email"]
        assert mock_get_bad_actor_score.call_args[0][0]["street"] == serializer.validated_data["mailing_street"]
        assert mock_get_bad_actor_score.call_args[0][0]["city"] == serializer.validated_data["mailing_city"]
        assert mock_get_bad_actor_score.call_args[0][0]["state"] == serializer.validated_data["mailing_state"]
        assert mock_get_bad_actor_score.call_args[0][0]["country"] == serializer.validated_data["mailing_country"]
        assert mock_get_bad_actor_score.call_args[0][0]["zipcode"] == serializer.validated_data["mailing_postal_code"]
        assert mock_get_bad_actor_score.call_args[0][0]["complement"] == serializer.validated_data["mailing_complement"]
        assert mock_get_bad_actor_score.call_args[0][0]["captcha_token"] == serializer.validated_data["captcha_token"]
        assert mock_get_bad_actor_score.call_args[0][0]["ip"] == request.META["REMOTE_ADDR"]
        assert mock_get_bad_actor_score.call_args[0][0]["referer"] == request.META["HTTP_REFERER"]
        assert (
            mock_get_bad_actor_score.call_args[0][0]["reason_for_giving"]
            == serializer.validated_data["reason_for_giving"]
        )

    @pytest.mark.parametrize(
        "country_code",
        ["US", "CA", "GB"],
    )
    def test_get_bad_actor_score_country_code(self, minimally_valid_contribution_form_data, mocker, country_code):
        mock_get_bad_actor_score = mocker.patch("apps.contributions.serializers.get_bad_actor_score")
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com", HTTP_CF_IPCOUNTRY=country_code).post(
            "", {}, format="json"
        )
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid() is True
        serializer.get_bad_actor_score(serializer.validated_data, action=BadActorAction.CONTRIBUTION.value)
        assert mock_get_bad_actor_score.call_count == 1
        assert "country_code" in mock_get_bad_actor_score.call_args[0][0]
        assert mock_get_bad_actor_score.call_args[0][0]["country_code"] == country_code

    def test_get_bad_actor_score_no_country_code(self, minimally_valid_contribution_form_data, mocker):
        """Show that calling `get_bad_actor_score` returns response data.

        Note: `get_bad_actor` uses `BadActorSerializer` internally, which requires there to be an
        HTTP referer in the request, so that's why we set in request factory below.
        """
        mock_get_bad_actor_score = mocker.patch("apps.contributions.serializers.get_bad_actor_score")
        # No Cf-IpCountry header in request
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid() is True
        serializer.get_bad_actor_score(serializer.validated_data, action=BadActorAction.CONTRIBUTION.value)
        assert mock_get_bad_actor_score.call_count == 1
        # BadActorSerializer serializer.validated_data returns empty string for country_code
        assert mock_get_bad_actor_score.call_args[0][0]["country_code"] == ""

    @pytest.mark.usefixtures("bad_actor_good_response")
    def test_get_bad_actor_score_happy_path(self, minimally_valid_contribution_form_data, bad_actor_good_score):
        """Show that calling `get_bad_actor_score` returns response data.

        Note: `get_bad_actor` uses `BadActorSerializer` internally, which requires there to be an
        HTTP referer in the request, so that's why we set in request factory below.
        """
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid() is True
        assert (
            serializer.get_bad_actor_score(serializer.validated_data, action=BadActorAction.CONTRIBUTION.value)
            == bad_actor_good_score
        )

    def test_get_bad_actor_score_when_data_invalid(self, minimally_valid_contribution_form_data, monkeypatch):
        """Show if the bad actor serialier data is invalid no exception is raise, but method returns None.

        We achieve an invalid state by omitting http referer from the request context
        """
        monkeypatch.setattr("apps.contributions.serializers.get_bad_actor_score", mock_get_bad_actor)
        request = APIRequestFactory().post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid() is True
        bad_actor_data = serializer.get_bad_actor_score(
            serializer.validated_data, action=BadActorAction.CONTRIBUTION.value
        )
        assert bad_actor_data is None

    def test_get_bad_actor_score_when_bad_actor_api_error(self, minimally_valid_contribution_form_data, monkeypatch):
        """Show if call to `get_bad_actor_score` in `get_bad_actor_score` results in BadActorAPIError, the.

        method call still succeeds, returning None.
        """
        monkeypatch.setattr("apps.contributions.serializers.get_bad_actor_score", mock_get_bad_actor_raise_exception)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid() is True
        bad_actor_data = serializer.get_bad_actor_score(
            serializer.validated_data, action=BadActorAction.CONTRIBUTION.value
        )
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
    def test_build_contribution_happy_path(
        self, interval, minimally_valid_contribution_form_data, bad_actor_good_response
    ):
        minimally_valid_contribution_form_data["interval"] = interval.value
        contributor = ContributorFactory()
        serializer = self.serializer_class(
            data=minimally_valid_contribution_form_data, context={"request": APIRequestFactory().post("")}
        )
        assert serializer.is_valid() is True
        contribution = serializer.build_contribution(
            contributor, serializer.validated_data, bad_actor_good_response.return_value
        )
        expectations = {
            "amount": serializer.validated_data["amount"],
            "interval": serializer.validated_data["interval"],
            "currency": serializer.validated_data["page"].revenue_program.payment_provider.currency,
            "status": ContributionStatus.PROCESSING,
            "donation_page": serializer.validated_data["page"],
            "contributor": contributor,
            "payment_provider_used": "Stripe",
            "bad_actor_score": bad_actor_good_response.return_value.overall_judgment,
            "bad_actor_response": bad_actor_good_response.return_value.dict(),
            "flagged_date": None,
        }
        for key, val in expectations.items():
            assert getattr(contribution, key) == val

    def test_build_contribution_when_should_flag(
        self, minimally_valid_contribution_form_data, bad_actor_bad_response, bad_actor_bad_score
    ):
        contributor = ContributorFactory()
        serializer = self.serializer_class(
            data=minimally_valid_contribution_form_data, context={"request": APIRequestFactory().post("")}
        )
        assert serializer.is_valid() is True
        contribution = serializer.build_contribution(
            contributor, serializer.validated_data, bad_actor_bad_response.return_value
        )
        expectations = {
            "amount": serializer.validated_data["amount"],
            "interval": serializer.validated_data["interval"],
            "currency": serializer.validated_data["page"].revenue_program.payment_provider.currency,
            "status": ContributionStatus.FLAGGED,
            "donation_page": serializer.validated_data["page"],
            "contributor": contributor,
            "payment_provider_used": "Stripe",
            "bad_actor_score": bad_actor_bad_score.overall_judgment,
            "bad_actor_response": bad_actor_bad_score.dict(),
        }
        for key, val in expectations.items():
            assert getattr(contribution, key) == val
        assert contribution.flagged_date is not None

    def test_build_contribution_when_should_reject(
        self, minimally_valid_contribution_form_data, bad_actor_super_bad_response, bad_actor_super_bad_score
    ):
        contributor = ContributorFactory()
        serializer = self.serializer_class(
            data=minimally_valid_contribution_form_data, context={"request": APIRequestFactory().post("")}
        )
        assert serializer.is_valid() is True
        contribution = serializer.build_contribution(
            contributor, serializer.validated_data, bad_actor_super_bad_response.return_value
        )
        expectations = {
            "amount": serializer.validated_data["amount"],
            "interval": serializer.validated_data["interval"],
            "currency": serializer.validated_data["page"].revenue_program.payment_provider.currency,
            "status": ContributionStatus.REJECTED,
            "donation_page": serializer.validated_data["page"],
            "contributor": contributor,
            "payment_provider_used": "Stripe",
            "bad_actor_score": bad_actor_super_bad_score.overall_judgment,
            "bad_actor_response": bad_actor_super_bad_score.dict(),
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
        assert serializer.is_valid() is True

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
        assert str(metadata.referer) == str(pydantic.HttpUrl(referer))
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
            "mc_campaign_id",
        )
        for x in optional_fields_defaulting_to_none:
            assert getattr(metadata, x) is None

    def test_get_bad_actor_score_when_uncaught_error_calling_internal(
        self, minimally_valid_contribution_form_data, get_bad_actor_score_causes_uncaught
    ):
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid() is True
        assert (
            serializer.get_bad_actor_score(serializer.validated_data, action=BadActorAction.CONTRIBUTION.value) is None
        )
        get_bad_actor_score_causes_uncaught.assert_called_once()


@pytest.fixture
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


@pytest.mark.django_db
class TestCreateOneTimePaymentSerializer:
    serializer_class = serializers.CreateOneTimePaymentSerializer

    def test_is_subclass_of_BaseCreatePaymentSerializer(self):
        """Prove that CreateOneTimePaymentSerializer is a subclass of BaseCreatePaymentSerializer.

        This is so the testing of the parent class' behavior accrues to the child.
        """
        assert issubclass(self.serializer_class, serializers.BaseCreatePaymentSerializer)

    @pytest.mark.usefixtures("bad_actor_good_response")
    def test_happy_path(self, minimally_valid_contribution_form_data, mocker):
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
        assert serializer.is_valid() is True
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
        self, minimally_valid_contribution_form_data, mocker, bad_actor_good_response
    ):
        """Demonstrate `.create` when there's a Stripe error when creating payment intent.

        A contributor and contribution should still be created as in happy path, but a GenericPaymentError should
        be raised.

        """
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        save_spy = mocker.spy(Contributor, "save")
        mock_create_stripe_customer = mocker.patch("apps.contributions.models.Contribution.create_stripe_customer")
        mock_create_stripe_customer.return_value = AttrDict({"id": (fake_customer_id := "fake-customer-id")})

        mock_create_stripe_one_time_payment_intent = mocker.patch(
            "apps.contributions.models.Contribution.create_stripe_one_time_payment_intent"
        )
        mock_create_stripe_one_time_payment_intent.side_effect = stripe.error.StripeError("Stripe error")

        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")

        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})

        assert serializer.is_valid() is True
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
        assert contribution.bad_actor_response == bad_actor_good_response.return_value.dict()
        assert contribution.contribution_metadata is not None
        assert contribution.provider_customer_id == fake_customer_id
        assert contribution.provider_payment_id is None

        save_spy.assert_called_once()

    @pytest.mark.usefixtures("bad_actor_good_response")
    def test_when_stripe_errors_creating_customer(self, minimally_valid_contribution_form_data, mocker):
        """Demonstrate `.create` when there's a Stripe error when creating customer.

        A contributor and contribution should still be created as in happy path, but a GenericPaymentError should
        be raised.
        """
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        save_spy = mocker.spy(Contributor, "save")

        mocker.patch(
            "apps.contributions.models.Contribution.create_stripe_customer", side_effect=stripe.error.StripeError
        )

        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")

        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})

        assert serializer.is_valid() is True

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

    @pytest.mark.usefixtures("bad_actor_bad_response")
    def test_when_contribution_is_flagged(self, minimally_valid_contribution_form_data, mocker):
        """Demonstrate `.create` when the contribution gets flagged.

        A contributor, contribution, and Stripe entities should still be created as in happy path, but the `capture_method` on
        the PaymentIntent should be "manual"
        """
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        save_spy = mocker.spy(Contributor, "save")
        mock_create_stripe_customer = Mock()
        fake_customer_id = "fake-customer-id"
        mock_create_stripe_customer.return_value = AttrDict({"id": fake_customer_id})
        mocker.patch("stripe.Customer.create", mock_create_stripe_customer)

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
        mocker.patch("stripe.PaymentIntent.create", mock_create_stripe_one_time_payment_intent)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid() is True
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
            "idempotency_key": f"{contribution.uuid}-payment-intent",
        }
        save_spy.assert_called_once()

    @pytest.mark.usefixtures("bad_actor_super_bad_response")
    def test_when_contribution_is_rejected(self, minimally_valid_contribution_form_data, mocker):
        """Demonstrate `.create` when the contribution gets flagged.

        A contributor and contribution should still be created as in happy path, but a PermissionDenied error should occur, and
        a Stripe payment intent should not be created.
        """
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        save_spy = mocker.spy(Contributor, "save")
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=minimally_valid_contribution_form_data, context={"request": request})
        assert serializer.is_valid() is True
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

    @pytest.mark.usefixtures("bad_actor_good_response")
    def test_create_when_value_error_creating_metadata(
        self,
        minimally_valid_contribution_form_data,
        mocker,
    ):
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


@pytest.mark.django_db
class TestCreateRecurringPaymentSerializer:
    serializer_class = serializers.CreateRecurringPaymentSerializer

    def test_is_subclass_of_BaseCreatePaymentSerializer(self):
        """Prove that CreateRecurringPaymentSerializer is a subclass of BaseCreatePaymentSerializer.

        This is so the testing of the parent class' behavior accrues to the child.
        """
        assert issubclass(self.serializer_class, serializers.BaseCreatePaymentSerializer)

    @pytest.mark.parametrize("interval", ["month", "year"])
    @pytest.mark.usefixtures("bad_actor_good_response")
    def test_create_happy_path(self, minimally_valid_contribution_form_data, interval, mocker):
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

        assert serializer.is_valid() is True

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

    @pytest.mark.usefixtures("bad_actor_good_response")
    def test_create_when_stripe_errors_creating_subscription(self, minimally_valid_contribution_form_data, mocker):
        """Demonstrate `.create` when there's a Stripe error when creating subscription.

        A contributor and contribution should still be created as in happy path, but a GenericPaymentError should
        be raised, and no Stripe subscription created.
        """
        save_spy = mocker.spy(Contribution, "save")
        data = minimally_valid_contribution_form_data | {"interval": "month"}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        mock_create_stripe_customer = Mock()
        mock_create_stripe_customer.return_value = AttrDict({"id": "some id"})
        mocker.patch("stripe.Customer.create", mock_create_stripe_customer)
        mocker.patch("apps.contributions.models.stripe.Subscription.create", side_effect=stripe.error.StripeError)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")

        serializer = self.serializer_class(data=data, context={"request": request})

        assert serializer.is_valid() is True
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

    @pytest.mark.usefixtures("bad_actor_good_response")
    def test_create_when_stripe_errors_creating_customer(self, minimally_valid_contribution_form_data, mocker):
        """Demonstrate `.create` when there's a Stripe error when creating customer.

        A contributor and contribution should still be created as in happy path, but a GenericPaymentError should
        be raised.
        """
        save_spy = mocker.spy(Contribution, "save")
        data = minimally_valid_contribution_form_data | {"interval": "month"}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()

        mocker.patch("stripe.Customer.create", side_effect=stripe.error.StripeError)

        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")

        serializer = self.serializer_class(data=data, context={"request": request})

        assert serializer.is_valid() is True

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

    @pytest.mark.usefixtures("bad_actor_bad_response")
    def test_create_when_contribution_is_flagged(self, minimally_valid_contribution_form_data, mocker):
        """Demonstrate `.create` when the contribution gets flagged.

        All entities created in happy path should be created here, but the status on contribution should
        be "flagged" and the subscription should have a trial.
        """
        save_spy = mocker.spy(Contribution, "save")
        data = minimally_valid_contribution_form_data | {"interval": "month"}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()
        mock_create_stripe_customer = Mock()
        fake_customer_id = "fake-customer-id"
        mock_create_stripe_customer.return_value = AttrDict({"id": fake_customer_id})
        mocker.patch("stripe.Customer.create", mock_create_stripe_customer)
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
        mocker.patch("stripe.SetupIntent.create", mock_setup_intent_create)
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=data, context={"request": request})

        assert serializer.is_valid() is True
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

    @pytest.mark.usefixtures("bad_actor_super_bad_response")
    def test_create_when_contribution_is_rejected(self, minimally_valid_contribution_form_data, mocker):
        """Demonstrate `.create` when the contribution gets flagged.

        A contributor and contribution should still be created as in happy path, but a PermissionDenied error should occur, and
        a Stripe subscription should not be created.
        """
        save_spy = mocker.spy(Contribution, "save")
        data = minimally_valid_contribution_form_data | {"interval": "month"}
        contribution_count = Contribution.objects.count()
        contributor_count = Contributor.objects.count()
        request = APIRequestFactory(HTTP_REFERER="https://www.google.com").post("", {}, format="json")
        serializer = self.serializer_class(data=data, context={"request": request})

        assert serializer.is_valid() is True

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


@pytest.mark.django_db
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


@pytest.mark.django_db
class TestPortalContributionDetailSerializer:
    def test_update_amount_monthly_contribution(self, mocker, monthly_contribution):
        monthly_contribution.stripe_subscription = MockSubscription("active")
        mocker.patch(
            "stripe.SubscriptionItem.list",
            return_value={
                "data": [
                    {
                        "id": "si_123",
                        "price": {
                            "currency": "usd",
                            "product": "prod_123",
                            "recurring": {
                                "interval": "month",
                            },
                        },
                    }
                ]
            },
        )
        mocker.patch("stripe.Subscription.modify")
        serializer = PortalContributionDetailSerializer(instance=monthly_contribution)
        updated_contribution = serializer.update(
            monthly_contribution, {"amount": 12345, "donor_selected_amount": 123.45}
        )
        assert updated_contribution.amount == 12345
        assert updated_contribution.contribution_metadata["donor_selected_amount"] == 123.45

    def test_update_amount_one_time_contribution(self, one_time_contribution):
        one_time_contribution.stripe_subscription = MockSubscription("active")
        serializer = PortalContributionDetailSerializer(instance=one_time_contribution)
        with pytest.raises(ValueError, match="Cannot update amount for one-time contribution"):
            serializer.update(one_time_contribution, {"amount": 12345, "donor_selected_amount": 123.45})

    def test_update_raises_if_donor_selected_amount_omitted(self, mocker, monthly_contribution):
        monthly_contribution.stripe_subscription = MockSubscription("active")
        serializer = PortalContributionDetailSerializer(instance=monthly_contribution)
        with pytest.raises(ValidationError, match="If amount is updated, donor_selected_amount must be set as well."):
            serializer.update(monthly_contribution, {"amount": 12345})

    def test_amount_donor_selected_amount_validation(self, monthly_contribution):
        serializer = PortalContributionDetailSerializer(instance=monthly_contribution)
        with pytest.raises(
            ValidationError, match="If this field is updated, donor_selected_amount must be provided as well."
        ):
            serializer.validate({"amount": 12345})
        with pytest.raises(ValidationError, match="If this field is updated, amount must be provided as well."):
            serializer.validate({"donor_selected_amount": 123.45})

    def test_amount_donor_selected_amount_too_small(self):
        serializer = PortalContributionDetailSerializer(data={"amount": 0, "donor_selected_amount": 0})
        with pytest.raises(ValidationError, match="We can only accept contributions greater than or equal to 1.00"):
            serializer.is_valid(raise_exception=True)

    def test_amount_donor_selected_amount_too_big(self):
        serializer = PortalContributionDetailSerializer(data={"amount": 100000000, "donor_selected_amount": 1000000})
        with pytest.raises(ValidationError, match="We can only accept contributions less than or equal to 999,999.99"):
            serializer.is_valid(raise_exception=True)


@pytest.mark.django_db
class TestPortalContributionPaymentSerializer:

    @pytest.fixture
    def paid_payment(self):
        return PaymentFactory(paid=True)

    @pytest.fixture
    def refunded_payment(self):
        return PaymentFactory(refund=True)

    @pytest.mark.parametrize(
        "payment_fixture",
        [
            "paid_payment",
            "refunded_payment",
        ],
    )
    def test_has_expected_fields(self, payment_fixture, request):
        payment = request.getfixturevalue(payment_fixture)
        expected_fields = [
            "id",
            "amount_refunded",
            "created",
            "transaction_time",
            "gross_amount_paid",
            "net_amount_paid",
            "status",
        ]
        serialized = serializers.PortalContributionPaymentSerializer(instance=payment)
        assert set(serialized.data.keys()) == set(expected_fields)

    @pytest.mark.parametrize(
        ("payment_fixture", "expected_status"),
        [("paid_payment", PAYMENT_PAID), ("refunded_payment", PAYMENT_REFUNDED)],
    )
    def test_status(self, request, payment_fixture, expected_status):
        payment = request.getfixturevalue(payment_fixture)
        serialized = serializers.PortalContributionPaymentSerializer(instance=payment)
        assert serialized.data["status"] == expected_status


@pytest.mark.django_db
class TestSwitchboardContributionSerializer:
    def test_get_revenue_program_source_when_no_source(self, one_time_contribution):
        one_time_contribution.donation_page = None
        one_time_contribution._revenue_program = None
        serializer = serializers.SwitchboardContributionSerializer(data={})
        assert serializer.get_revenue_program_source(instance=one_time_contribution) is None


@pytest.mark.django_db
class TestSwitchboardPaymentSerializer:

    @pytest.fixture
    def payment(self):
        return PaymentFactory(paid=True)

    @pytest.fixture
    def payment_create_data(self, payment):
        return {
            "contribution": payment.contribution.id,
            "net_amount_paid": 2000,
            "gross_amount_paid": 2000,
            "amount_refunded": 0,
            "stripe_balance_transaction_id": "txn_123456",
            "transaction_time": timezone.now().isoformat(),
        }

    def test_serializer_valid_data(self, payment_create_data):
        serializer = SwitchboardPaymentSerializer(data=payment_create_data)
        assert serializer.is_valid() is True
        assert set(serializer.validated_data.keys()) == {
            "contribution",
            "net_amount_paid",
            "gross_amount_paid",
            "amount_refunded",
            "stripe_balance_transaction_id",
            "transaction_time",
        }

    def test_serializer_missing_required_fields(self):
        serializer = SwitchboardPaymentSerializer(data={})
        assert serializer.is_valid() is False
        assert set(serializer.errors.keys()) == {
            "contribution",
            "net_amount_paid",
            "gross_amount_paid",
            "amount_refunded",
            "stripe_balance_transaction_id",
            "transaction_time",
        }

    def test_serializer_invalid_contribution(self):
        data = {
            "contribution": 99999,
            "net_amount_paid": 2000,
            "gross_amount_paid": 2000,
            "amount_refunded": 0,
            "stripe_balance_transaction_id": "txn_123456",
            "transaction_time": timezone.now().isoformat(),
        }
        serializer = SwitchboardPaymentSerializer(data=data)
        assert serializer.is_valid() is False
        assert "contribution" in serializer.errors

    def test_serializer_validate_duplicate_balance_transaction_id(self, payment):
        data = {
            "contribution": payment.contribution.id,
            "net_amount_paid": 2000,
            "gross_amount_paid": 2000,
            "amount_refunded": 0,
            "stripe_balance_transaction_id": payment.stripe_balance_transaction_id,
            "transaction_time": timezone.now().isoformat(),
        }
        serializer = SwitchboardPaymentSerializer(data=data)
        assert serializer.is_valid() is False
        assert "stripe_balance_transaction_id" in serializer.errors

    def test_amounts_must_be_positive(self, payment_create_data):
        serializer = SwitchboardPaymentSerializer(
            data={
                **payment_create_data,
                "net_amount_paid": -1,
                "gross_amount_paid": -1,
            }
        )
        assert serializer.is_valid() is False
        assert "net_amount_paid" in serializer.errors
        assert "gross_amount_paid" in serializer.errors

    def test_validate_refund_and_payment_amounts_mutually_exclusive(self, payment_create_data):
        data = {**payment_create_data, "amount_refunded": 1000, "net_amount_paid": 2000, "gross_amount_paid": 2000}
        serializer = SwitchboardPaymentSerializer(data=data)
        assert serializer.is_valid() is False
        assert "non_field_errors" in serializer.errors
        assert serializer.errors["non_field_errors"][0] == (
            "Amount refunded cannot be positive when net_amount_paid or gross_amount_paid are positive"
        )

    def test_validate_stripe_balance_transaction_id(self, payment_create_data):
        """Test validation of stripe_balance_transaction_id field."""
        existing_txn_id = "txn_existing"
        _ = PaymentFactory(stripe_balance_transaction_id=existing_txn_id)

        data = {**payment_create_data, "stripe_balance_transaction_id": existing_txn_id}
        serializer = SwitchboardPaymentSerializer(data=data)
        assert serializer.is_valid() is False
        assert "stripe_balance_transaction_id" in serializer.errors
        assert "payment with this stripe balance transaction id already exists." in str(
            serializer.errors["stripe_balance_transaction_id"][0]
        )
