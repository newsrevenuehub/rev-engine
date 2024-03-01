import random
from datetime import timedelta
from io import BytesIO
from unittest import mock

from django.apps import apps
from django.contrib.messages.middleware import MessageMiddleware
from django.contrib.sessions.middleware import SessionMiddleware
from django.core.files.images import ImageFile
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.http import HttpRequest
from django.test import RequestFactory, TestCase, override_settings

import PIL.Image
import pytest
from faker import Faker

from apps.common.utils import (
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
)


DEFAULT_MAX_SLUG_LENGTH = 50


def get_test_image_file_jpeg(filename="test.jpg", colour="white", size=(640, 480)):
    f = BytesIO()
    image = PIL.Image.new("RGB", size, colour)
    image.save(f, "JPEG")
    return ImageFile(f, name=filename)


def get_test_image_binary(colour="white", size=(640, 480)):
    f = BytesIO()
    image = PIL.Image.new("RGB", size, colour)
    image.save(f, "JPEG")
    return image


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


def setup_request(user, request):
    request.user = user

    # Annotate a request object with a session
    #  TypeError: SessionMiddleware.__init__() missing 1 required positional argument: 'get_response'
    middleware = SessionMiddleware()
    middleware.process_request(request)
    request.session.save()

    # Annotate a request object with a message
    middleware = MessageMiddleware()
    middleware.process_request(request)
    request.session.save()

    request.session["some"] = "some"
    request.session.save()


def generate_random_datetime(start, end):
    return start + timedelta(seconds=random.randint(0, int((end - start).total_seconds())))


def get_random_jpg_filename():
    fake = Faker()
    Faker.seed(random.randint(1, 10000000))
    return f"{fake.word()}.jpg"


test_domain = ".test.org"


@override_settings(ALLOWED_HOSTS=[test_domain])
def test_get_subdomain_from_request():
    factory = RequestFactory()
    request = factory.get("/")

    # URL with subdomain returns subdomain
    target_subdomain = "my-subby"
    request.META["HTTP_HOST"] = f"{target_subdomain}{test_domain}"
    resultant_subdomain = get_subdomain_from_request(request)
    assert resultant_subdomain == target_subdomain

    # URL without subdomain returns nothing
    request.META["HTTP_HOST"] = "test.org"
    no_subdomain = get_subdomain_from_request(request)
    assert not no_subdomain


class TestMigrations(TestCase):
    @property
    def app(self):
        return apps.get_containing_app_config(type(self).__module__).label

    migrate_from = None
    migrate_to = None

    def setUp(self):
        assert (
            self.migrate_from and self.migrate_to
        ), "TestCase '{}' must define migrate_from and migrate_to properties".format(type(self).__name__)

        self.migrate_from = [
            (
                self.app,
                self.migrate_from,
            )
        ]
        self.migrate_to = [
            (
                self.app,
                self.migrate_to,
            )
        ]
        executor = MigrationExecutor(connection)
        old_apps = executor.loader.project_state(self.migrate_from).apps

        # Reverse to the original migration
        executor.migrate(self.migrate_from)

        self.setUpBeforeMigration(old_apps)

        # Run the migration to test
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()  # reload.
        executor.migrate(self.migrate_to)

        self.apps = executor.loader.project_state(self.migrate_to).apps

    def setUpBeforeMigration(self, apps):
        pass


@pytest.mark.parametrize(
    "branch_name,expected", (("dev-1234", "dev-1234"), ("dev-1234-foo", "dev-1234"), ("rando", None))
)
def test_extract_ticket_id_from_branch_name(branch_name: str, expected: str, mocker):
    logger_spy = mocker.spy(logger, "warning")
    assert extract_ticket_id_from_branch_name(branch_name) == expected
    if not expected:
        logger_spy.assert_called_once_with("Could not extract ticket id from branch name: %s", branch_name)
    else:
        logger_spy.assert_not_called()


@override_settings(HEROKU_APP_NAME="foo")
@override_settings(CF_ZONE_NAME="bar")
@mock.patch("CloudFlare.CloudFlare")
def test_upsert_cloudflare_cnames(cloudflare_class_mock):
    mock_cloudflare = mock.MagicMock()
    cloudflare_class_mock.return_value = mock_cloudflare

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


@mock.patch("stripe.WebhookEndpoint.list")
@mock.patch("stripe.WebhookEndpoint.delete")
def test_delete_stripe_webhook(delete_mock, list_mock):
    list_mock.return_value = {"data": [{"url": "https://notthere.com/webhook", "id": "123"}]}
    delete_stripe_webhook("https://example.com/webhook", api_key="bogus")
    assert not delete_mock.called

    list_mock.return_value = {"data": [{"url": "https://example.com/webhook", "id": "123"}]}
    delete_stripe_webhook("https://example.com/webhook", api_key="bogus")
    assert delete_mock.called_with("123", api_key="bogus")


@mock.patch("stripe.WebhookEndpoint.list")
@mock.patch("stripe.WebhookEndpoint.create")
def test_create_stripe_webhook(create_mock, list_mock):
    list_mock.return_value = {"data": [{"url": "https://example.com/webhook", "id": "123"}]}
    create_stripe_webhook("https://example.com/webhook", api_key="bogus", enabled_events=[])
    assert not create_mock.called

    list_mock.return_value = {"data": [{"url": "https://example.com/webhook", "id": "123"}]}
    create_stripe_webhook("https://notthere.com/webhook", api_key="bogus", enabled_events=[])
    assert create_mock.called_with("https://notthere.com/webhook", api_key="bogus", enabled_events=[])


@override_settings(HEROKU_APP_NAME="foo")
@override_settings(CF_ZONE_NAME="bar")
@mock.patch("CloudFlare.CloudFlare")
def test_delete_cloudflare_cnames(cloudflare_class_mock):
    mock_cloudflare = mock.MagicMock()
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
    "enable_pubsub,gcloud_project,expected",
    ((True, "project", True), (False, "project", False), (True, None, False), (False, None, False), (True, "", False)),
)
def test_google_cloud_pub_sub_is_configured(enable_pubsub, gcloud_project, expected, monkeypatch):
    monkeypatch.setattr("django.conf.settings.ENABLE_PUBSUB", enable_pubsub)
    monkeypatch.setattr("django.conf.settings.GOOGLE_CLOUD_PROJECT", gcloud_project)
    assert google_cloud_pub_sub_is_configured() == expected
