from django.http import HttpRequest
from django.test import RequestFactory

import pytest

from apps.common.utils import (
    booleanize_string,
    create_stripe_webhook,
    delete_cloudflare_cnames,
    delete_stripe_webhook,
    extract_ticket_id_from_branch_name,
    get_original_ip_from_request,
    get_subdomain_from_request,
    google_cloud_pub_sub_is_configured,
    logger,
    normalize_slug,
    upsert_cloudflare_cnames,
    upsert_with_diff_check,
)
from apps.pages.tests.factories import DonationPageFactory


DEFAULT_MAX_SLUG_LENGTH = 50


def test_normalize_slug_name_only():
    assert len(normalize_slug("A name")) == 6
    assert len(normalize_slug(f"{'x' * 60}")) == DEFAULT_MAX_SLUG_LENGTH


def test_slug_with_supplied_slug():
    assert normalize_slug(name="No Name", slug="A Name") == "a-name"


def test_slug_with_name():
    assert (normalize_slug(name="A name not slug")) == "a-name-not-slug"


def test_custom_length_allowed():
    assert len(normalize_slug(f"{'x' * 60}", max_length=70)) == 60


def test_custom_length_enforced():
    assert len(normalize_slug(f"{'x' * 80}", max_length=70)) == 70


test_domain = ".test.org"
custom_map = {"custom.test.org": "test-rp-slug"}


@pytest.mark.parametrize(
    ("hostmap", "request_host", "expected"),
    [
        ({}, f"my-subby{test_domain}", "my-subby"),
        ({}, "test.org", None),
        (custom_map, f"rp-slug{test_domain}", "rp-slug"),
        (custom_map, "custom.test.org", "test-rp-slug"),
    ],
)
def test_get_subdomain_from_request(hostmap, request_host, expected, settings):
    request = RequestFactory().get("/")
    request.META["HTTP_HOST"] = request_host
    settings.HOST_MAP = hostmap
    assert get_subdomain_from_request(request) == expected


@pytest.mark.parametrize(
    ("branch_name", "expected"), [("dev-1234", "dev-1234"), ("dev-1234-foo", "dev-1234"), ("rando", None)]
)
def test_extract_ticket_id_from_branch_name(branch_name: str, expected: str, mocker):
    logger_spy = mocker.spy(logger, "warning")
    assert extract_ticket_id_from_branch_name(branch_name) == expected
    if not expected:
        logger_spy.assert_called_once_with("Could not extract ticket id from branch name: %s", branch_name)
    else:
        logger_spy.assert_not_called()


def test_upsert_cloudflare_cnames(mocker, settings):
    settings.CF_ZONE_NAME = "bar"
    settings.HEROKU_APP_NAME = "foo"
    mock_cloudflare_class = mocker.patch("CloudFlare.CloudFlare")
    mock_cloudflare = mocker.MagicMock()
    mock_cloudflare_class.return_value = mock_cloudflare

    mock_cloudflare.zones.get.return_value = {"result": [{"id": "foo"}], "result_info": {"total_count": 1}}

    # DNS record is already there; shouldn't do anything:
    mock_cloudflare.zones.dns_records.get.return_value = {
        "result": [{"name": "quux.bar", "id": "123", "content": "foo.herokuapp.com"}],
        "result_info": {"total_count": 1},
    }
    upsert_cloudflare_cnames(["quux"])
    assert not mock_cloudflare.zones.dns_records.post.called
    assert not mock_cloudflare.zones.dns_records.patch.called
    mock_cloudflare.reset_mock()

    # DNS records aren't there; should create it:
    mock_cloudflare.zones.dns_records.get.return_value = {
        "result": [{"name": "abc", "id": "123", "content": "xyz"}],
        "result_info": {"total_count": 1},
    }
    upsert_cloudflare_cnames(["quux", "frob"])
    mock_cloudflare.zones.get.assert_called_once_with(params={"name": "bar"})
    mock_cloudflare.zones.dns_records.get.assert_called_once_with("foo", params={"per_page": 300, "page": 1})
    assert mock_cloudflare.zones.dns_records.post.call_count == 2
    mock_cloudflare.zones.dns_records.post.assert_any_call(
        "foo", data={"type": "CNAME", "name": "quux", "content": "foo.herokuapp.com", "proxied": True}
    )
    mock_cloudflare.zones.dns_records.post.assert_called_with(
        "foo", data={"type": "CNAME", "name": "frob", "content": "foo.herokuapp.com", "proxied": True}
    )
    assert not mock_cloudflare.zones.dns_records.patch.called
    mock_cloudflare.reset_mock()

    # DNS records is there, but content is wrong; should update it - test with one page
    mock_cloudflare.zones.dns_records.get.return_value = {
        "result": [{"name": "quux.bar", "id": "123", "content": "foo.x.com"}],
        "result_info": {"total_count": 1},
    }
    upsert_cloudflare_cnames(["quux"])
    mock_cloudflare.zones.dns_records.patch.assert_called_once_with(
        "foo", "123", data={"type": "CNAME", "name": "quux", "content": "foo.herokuapp.com", "proxied": True}
    )
    mock_cloudflare.reset_mock()

    # DNS records is there, but content is wrong; should update it - Test with pagination (multiple pages)
    mock_cloudflare.zones.dns_records.get.side_effect = [
        {"result": [{"name": "quux.bar", "id": "123", "content": "foo.x.com"}], "result_info": {"total_count": 2}},
        {"result": [{"name": "foo.bar", "id": "456", "content": "foo.x.com"}], "result_info": {"total_count": 2}},
    ]

    upsert_cloudflare_cnames(["quux"], 1)
    mock_cloudflare.zones.get.assert_called_once_with(params={"name": "bar"})
    assert mock_cloudflare.zones.dns_records.get.call_count == 2
    mock_cloudflare.zones.dns_records.get.assert_any_call("foo", params={"per_page": 1, "page": 1})
    mock_cloudflare.zones.dns_records.get.assert_called_with("foo", params={"per_page": 1, "page": 2})
    mock_cloudflare.zones.dns_records.patch.assert_called_once_with(
        "foo", "123", data={"type": "CNAME", "name": "quux", "content": "foo.herokuapp.com", "proxied": True}
    )


def test_delete_stripe_webhook(mocker):
    list_mock = mocker.patch(
        "stripe.WebhookEndpoint.list", return_value={"data": [{"url": "https://notthere.com/webhook", "id": "123"}]}
    )
    delete_mock = mocker.patch("stripe.WebhookEndpoint.delete")
    delete_stripe_webhook("https://example.com/webhook", api_key="bogus")
    delete_mock.assert_not_called()
    list_mock.return_value = {"data": [{"url": "https://example.com/webhook", "id": "123"}]}
    delete_stripe_webhook("https://example.com/webhook", api_key="bogus")
    delete_mock.assert_called_once_with("123", api_key="bogus")


def test_create_stripe_webhook(mocker, settings):
    create_mock = mocker.patch("stripe.WebhookEndpoint.create")
    list_mock = mocker.patch(
        "stripe.WebhookEndpoint.list", return_value={"data": [{"url": "https://example.com/webhook", "id": "123"}]}
    )
    create_stripe_webhook("https://example.com/webhook", api_key="bogus", enabled_events=[])
    create_mock.assert_not_called()
    list_mock.return_value = {"data": [{"url": "https://example.com/webhook", "id": "123"}]}
    create_stripe_webhook("https://notthere.com/webhook", api_key="bogus", enabled_events=[])
    create_mock.assert_called_once_with(
        url="https://notthere.com/webhook",
        api_key="bogus",
        enabled_events=[],
        api_version=settings.STRIPE_API_VERSION,
        connect=True,
    )


def test_delete_cloudflare_cnames(settings, mocker):
    settings.CF_ZONE_NAME = "bar"
    settings.HEROKU_APP_NAME = "foo"
    cloudflare_class_mock = mocker.patch("CloudFlare.CloudFlare")
    mock_cloudflare = mocker.MagicMock()
    cloudflare_class_mock.return_value = mock_cloudflare
    mock_cloudflare.zones.get.return_value = {"result": [{"id": "foo"}]}
    mock_cloudflare.zones.dns_records.get.return_value = {
        "result": [{"name": "quux.bar", "id": "123", "content": "foo.herokuapp.com"}],
        "result_info": {"total_count": 1},
    }
    # no record there: shouldn't do anything
    delete_cloudflare_cnames("baz")
    assert not mock_cloudflare.zones.dns_records.delete.called
    mock_cloudflare.reset_mock()

    mock_cloudflare.zones.dns_records.get.return_value = {
        "result": [{"name": "abc", "id": "123", "content": "xyz"}],
        "result_info": {"total_count": 1},
    }
    delete_cloudflare_cnames("abc")
    mock_cloudflare.zones.get.assert_called_once_with(params={"name": "bar"})
    mock_cloudflare.zones.dns_records.get.assert_called_once_with("foo", params={"per_page": 300, "page": 1})
    mock_cloudflare.zones.dns_records.delete.assert_called_once_with("foo", "123")

    mock_cloudflare.reset_mock()
    # assert delete is called with correct params when there are multiple pages
    mock_cloudflare.zones.dns_records.get.side_effect = [
        {
            "result": [
                {"name": "quux.bar", "id": "456", "content": "foo.herokuapp.com"},
            ],
            "result_info": {"total_count": 2},
        },
        {"result": [{"name": "abc", "id": "123", "content": "xyz"}], "result_info": {"total_count": 2}},
    ]
    delete_cloudflare_cnames("abc", 1)
    mock_cloudflare.zones.get.assert_called_once_with(params={"name": "bar"})
    assert mock_cloudflare.zones.dns_records.get.call_count == 2
    mock_cloudflare.zones.dns_records.get.assert_any_call("foo", params={"per_page": 1, "page": 1})
    mock_cloudflare.zones.dns_records.get.assert_called_with("foo", params={"per_page": 1, "page": 2})
    mock_cloudflare.zones.dns_records.delete.assert_called_once_with("foo", "123")


def test_ip_in_cf_connecting_header():
    request = HttpRequest()
    request.META["HTTP_CF_CONNECTING_IP"] = "foo"
    request.META["HTTP_X_FORWARDED_FOR"] = "bar"
    request.META["REMOTE_ADDR"] = "baz"
    assert get_original_ip_from_request(request) == "foo"  # Cf-Connecting-IP is used
    request = HttpRequest()
    request.META["HTTP_X_FORWARDED_FOR"] = "bar"
    request.META["REMOTE_ADDR"] = "baz"
    assert get_original_ip_from_request(request) == "bar"  # X-Forwarded-For is used
    request = HttpRequest()
    request.META["REMOTE_ADDR"] = "baz"
    assert get_original_ip_from_request(request) == "baz"  # REMOTE_ADDR is used


@pytest.mark.parametrize(
    ("enable_pubsub", "gcloud_project", "expected"),
    [(True, "project", True), (False, "project", False), (True, None, False), (False, None, False), (True, "", False)],
)
def test_google_cloud_pub_sub_is_configured(enable_pubsub, gcloud_project, expected, monkeypatch):
    monkeypatch.setattr("django.conf.settings.ENABLE_PUBSUB", enable_pubsub)
    monkeypatch.setattr("django.conf.settings.GOOGLE_CLOUD_PROJECT", gcloud_project)
    assert google_cloud_pub_sub_is_configured() == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("True", True),
        ("true", True),
        ("yes", True),
        ("YES", True),
        ("y", True),
        ("Y", True),
        ("False", False),
        ("false", False),
        ("T", False),
        ("", False),
        ("unrelated", False),
    ],
)
def test_booleanize_string(value, expected):
    assert booleanize_string(value) == expected


@pytest.mark.django_db
class Test_upsert_with_diff_check:
    from apps.contributions.models import Contribution

    AMOUNT = 1000
    UPDATE_AMOUNT = 10000
    PROVIDER_PAYMENT_ID = "pi_1234"

    model = Contribution

    @pytest.fixture
    def instance(self):
        from apps.contributions.tests.factories import ContributionFactory

        return ContributionFactory(amount=self.AMOUNT, provider_payment_id=self.PROVIDER_PAYMENT_ID)

    @pytest.fixture
    def instance_is_none(self):
        return None

    @pytest.fixture
    def update_data(self):
        return {"amount": self.UPDATE_AMOUNT, "donation_page": DonationPageFactory()}

    @pytest.fixture
    def unique_identifier(self):
        return {"provider_payment_id": self.PROVIDER_PAYMENT_ID}

    @pytest.fixture
    def instance_needs_update(self, instance):
        return instance

    @pytest.fixture
    def instance_not_need_update(self, instance, update_data):
        for field, value in update_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance

    @pytest.fixture
    def instance_only_needs_amount_update(self, instance, update_data):
        for field, value in update_data.items():
            if field != "amount":
                setattr(instance, field, value)
        instance.save()
        return instance

    @pytest.fixture(
        params=[
            {"instance": "instance_needs_update", "dont_update": [], "action": "updated"},
            {"instance": "instance_not_need_update", "dont_update": [], "action": "left unchanged"},
            {"instance": "instance_only_needs_amount_update", "dont_update": [], "action": "updated"},
            {"instance": "instance_only_needs_amount_update", "dont_update": ["amount"], "action": "left unchanged"},
        ]
    )
    def upsert_with_diff_check_case(self, request):
        return (
            request.getfixturevalue(request.param["instance"]),
            request.param["action"],
            request.param["dont_update"],
        )

    def test_upsert_with_diff_check(self, upsert_with_diff_check_case, update_data, unique_identifier, mocker):
        instance, expected_action, dont_update = upsert_with_diff_check_case
        mock_set_comment = mocker.patch("reversion.set_comment")
        create_revision_mock = mocker.patch("reversion.create_revision")
        result, action = upsert_with_diff_check(
            model=self.model,
            unique_identifier=unique_identifier,
            defaults=update_data,
            caller_name=(caller := "test"),
            dont_update=dont_update,
        )
        if instance:
            assert result == instance
        else:
            assert isinstance(result, self.model)
        assert action == expected_action
        create_revision_mock.assert_called_once()

        match action:
            case "updated":
                mock_set_comment.assert_called_once_with(f"{caller} updated {self.model.__name__}")
            case "created":
                mock_set_comment.assert_called_once_with(f"{caller} created {self.model.__name__}")
            case _:
                mock_set_comment.assert_not_called()
