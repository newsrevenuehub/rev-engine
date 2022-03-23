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
import pytest
from faker import Faker

from apps.common.utils import (
    extract_ticket_id_from_branch_name,
    get_changes_from_prev_history_obj,
    get_subdomain_from_request,
    normalize_slug,
)
from apps.organizations.tests.factories import OrganizationFactory
from apps.pages.tests.factories import DonationPageFactory


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


def test_get_changes_from_prev_history_obj_wrong_type(db):
    """
    Passing the wrong type of object to get_changes_from_prev_history_obj() raises an error.

    The get_changes_from_prev_history_obj() function expects its only argument to
    be an instance of one of the 'historial' models that django_simple_history creates.
    """
    organization = OrganizationFactory()
    with pytest.raises(AttributeError):
        get_changes_from_prev_history_obj(organization)


def test_get_changes_from_prev_history_obj_create(db):
    """A historical change to create an object returns no changes."""
    organization = OrganizationFactory()
    historial_change_create = organization.history.first()
    assert get_changes_from_prev_history_obj(historial_change_create) == []


def test_get_changes_from_prev_history_obj_change_no_diff(db):
    """A historical change to update an object with no changes returns no changes."""
    # Create an Organization.
    organization = OrganizationFactory()
    historial_change_create = organization.history.first()
    # Save the Organization, but don't change any of the values.
    organization.save()
    historical_change_update = organization.history.exclude(history_id=historial_change_create.history_id).first()
    # The changes from the update should equal [].
    assert get_changes_from_prev_history_obj(historical_change_update) == []


def test_get_changes_from_prev_history_obj_change_with_diff(db):
    """A historical change to update an object with a change returns a list of changes."""
    # Create an Organization.
    organization = OrganizationFactory(salesforce_id="", stripe_account_id="1")
    historial_change_create = organization.history.first()
    # Save the Organization and change some of the values.
    organization.salesforce_id = "1"
    organization.stripe_account_id = "2"
    organization.save()
    historical_change_update = organization.history.exclude(history_id=historial_change_create.history_id).first()
    # The changes from the update should equal be the changes that were made.
    assert get_changes_from_prev_history_obj(historical_change_update) == [
        "'Salesforce ID' changed from '' to '1'",
        "'stripe account id' changed from '1' to '2'",
    ]


def test_get_changes_from_prev_history_obj_change_with_diff_jsonfield(db):
    """Historical change to update a JSONField only returns the field name in list of changes."""
    # Create a DonationPage.
    donation_page = DonationPageFactory()
    historial_change_create = donation_page.history.first()
    # Update the DonationPage's 'elements' field, which is a JSONField.
    donation_page.elements[0]["content"] += "something"
    donation_page.save()
    historical_change_update = donation_page.history.exclude(history_id=historial_change_create.history_id).first()
    # The changes from the update should only say the name of the 'elements' field.
    assert get_changes_from_prev_history_obj(historical_change_update) == ["'elements' changed"]


def test_get_changes_from_prev_history_obj_change_delete(db):
    """A historical change to delete an object returns no changes."""
    # Create an Organization.
    organization = OrganizationFactory(salesforce_id="", stripe_account_id="1")
    historial_change_create = organization.history.first()
    # Create a HistoricalOrganization object to delete the organization.
    HistoricalOrganization = historial_change_create.__class__
    historical_change_delete = HistoricalOrganization.objects.create(
        id=organization.id,
        history_date=historial_change_create.history_date,
        history_type="-",
        history_user=historial_change_create.history_user,
        history_change_reason=historial_change_create.history_change_reason or "",
    )
    # The changes from the delete should equal [], since the historical_change_delete
    # indicates that the organization should now be deleted.
    assert get_changes_from_prev_history_obj(historical_change_delete) == []


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
    assert ticket_id == "DEV-1420"
