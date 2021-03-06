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
from django.test import RequestFactory, TestCase, override_settings

import PIL.Image
from faker import Faker

from apps.common.utils import (
    create_stripe_webhook,
    delete_cloudflare_cnames,
    delete_stripe_webhook,
    extract_ticket_id_from_branch_name,
    get_subdomain_from_request,
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


def test_extract_ticket_id_from_branch_name():
    branch_name = "DEV-1420_db_review_apps"
    ticket_id = extract_ticket_id_from_branch_name(branch_name)
    assert ticket_id == "dev-1420"


@override_settings(HEROKU_APP_NAME="foo")
@override_settings(CF_ZONE_NAME="bar")
@mock.patch("CloudFlare.CloudFlare")
def test_upsert_cloudflare_cnames(cloudflare_class_mock):
    mock_cloudflare = mock.MagicMock()
    cloudflare_class_mock.return_value = mock_cloudflare

    mock_cloudflare.zones.get.return_value = [{"id": "foo"}]

    # DNS record is already there; shouldn't do anything:
    mock_cloudflare.zones.dns_records.get.return_value = [
        {"name": "quux.bar", "id": "123", "content": "foo.herokuapp.com"}
    ]
    upsert_cloudflare_cnames(["quux"])
    assert not mock_cloudflare.zones.dns_records.post.called
    assert not mock_cloudflare.zones.dns_records.patch.called

    # DNS records aren't there; should create it:
    mock_cloudflare.zones.dns_records.get.return_value = [{"name": "abc", "id": "123", "content": "xyz"}]
    upsert_cloudflare_cnames(["quux", "frob"])
    assert mock_cloudflare.zones.get.called_once_with(params={"name": "bar"})
    assert mock_cloudflare.zones.dns_records.get.called_once_with("foo", params={"per_page": 300})
    assert mock_cloudflare.zones.dns_records.post.called_once_with(
        "foo", data={"type": "CNAME", "name": "quux", "content": "quux.herokuapp.com", "proxied": True}
    )
    assert mock_cloudflare.zones.dns_records.post.called_once_with(
        "foo", data={"type": "CNAME", "name": "frob", "content": "frob.herokuapp.com", "proxied": True}
    )
    assert not mock_cloudflare.zones.dns_records.patch.called

    # DNS records is there, but content is wrong; should update it:
    mock_cloudflare.zones.dns_records.get.return_value = [{"name": "quux.bar", "id": "123", "content": "foo.x.com"}]
    upsert_cloudflare_cnames(["quux"])
    assert mock_cloudflare.zones.dns_records.patch.called_once_with(
        "foo", data={"type": "CNAME", "name": "quux", "content": "quux.herokuapp.com", "proxied": True}
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
    create_stripe_webhook("https://example.com/webhook", api_key="bogus")
    assert not create_mock.called

    list_mock.return_value = {"data": [{"url": "https://example.com/webhook", "id": "123"}]}
    create_stripe_webhook("https://notthere.com/webhook", api_key="bogus")
    assert create_mock.called_with("https://notthere.com/webhook", api_key="bogus")


@override_settings(HEROKU_APP_NAME="foo")
@override_settings(CF_ZONE_NAME="bar")
@mock.patch("CloudFlare.CloudFlare")
def test_delete_cloudflare_cnames(cloudflare_class_mock):
    mock_cloudflare = mock.MagicMock()
    cloudflare_class_mock.return_value = mock_cloudflare
    mock_cloudflare.zones.get.return_value = [{"id": "foo"}]
    mock_cloudflare.zones.dns_records.get.return_value = [
        {"name": "quux.bar", "id": "123", "content": "foo.herokuapp.com"}
    ]
    # no record there: shouldn't do anything
    delete_cloudflare_cnames("baz")
    assert not mock_cloudflare.zones.dns_records.delete.called

    mock_cloudflare.zones.dns_records.get.return_value = [{"name": "abc", "id": "123", "content": "xyz"}]
    delete_cloudflare_cnames("abc")
    assert mock_cloudflare.zones.get.called_once_with(params={"name": "bar"})
    assert mock_cloudflare.zones.dns_records.get.called_once_with("foo", params={"per_page": 300})
    assert mock_cloudflare.zones.dns_records.delet.called_once_with("foo", "123")
