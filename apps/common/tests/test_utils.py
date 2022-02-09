import random
from datetime import timedelta
from io import BytesIO

from django.apps import apps
from django.contrib.messages.middleware import MessageMiddleware
from django.contrib.sessions.middleware import SessionMiddleware
from django.core.files.images import ImageFile
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import RequestFactory, TestCase, override_settings

import PIL.Image
from faker import Faker

from apps.common.utils import get_subdomain_from_request, normalize_slug


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
