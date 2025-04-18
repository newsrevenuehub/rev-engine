from django.test import Client
from django.urls import reverse

import pytest
import pytest_mock
from bs4 import BeautifulSoup as bs4

from apps.activity_log.admin import LINKED_ACTOR_CLASSNAME, LINKED_OBJECT_CLASSNAME, ActivityLogAdmin
from apps.activity_log.models import ActivityLog
from apps.users.models import User


@pytest.mark.django_db
class TestActivityLogAdmin:

    @pytest.fixture
    def client(self, client: Client, admin_user: User) -> Client:
        client.force_login(admin_user)
        return client

    def test_list_view_stands_up(self, client: Client, activity_log: ActivityLog) -> None:
        url = reverse("admin:activity_log_activitylog_changelist")
        response = client.get(url, follow=True)
        assert response.status_code == 200
        soup = bs4(response.content, "html.parser")
        # These urls are expected given the specific objects this activity log points to (see fixture definition)
        expected_actor_url = reverse(
            "admin:contributions_contributor_change", args=[activity_log.actor_content_object.pk]
        )
        expected_object_url = reverse(
            "admin:contributions_contribution_change", args=[activity_log.activity_object_content_object.pk]
        )
        assert soup.find("a", class_=LINKED_ACTOR_CLASSNAME)["href"] == expected_actor_url
        assert soup.find("a", class_=LINKED_OBJECT_CLASSNAME)["href"] == expected_object_url
        assert str(activity_log.action) in soup.text

    def test_linked_actor_object_happy_path(self, activity_log: ActivityLog) -> None:
        admin = ActivityLogAdmin(ActivityLog, admin_site=None)
        actor_object = admin.linked_actor_object(activity_log)
        soup = bs4(actor_object, "html.parser")
        link = soup.find(class_=LINKED_ACTOR_CLASSNAME)
        assert link["href"] == reverse(
            "admin:contributions_contributor_change", args=[activity_log.actor_content_object.pk]
        )
        assert link.text == str(activity_log.actor_content_object)

    def test_linked_actor_object_when_no_url(
        self, activity_log: ActivityLog, mocker: pytest_mock.MockerFixture
    ) -> None:
        mocker.patch("apps.activity_log.admin.ActivityLogAdmin._get_admin_url_for_linked_object", return_value=None)
        admin = ActivityLogAdmin(ActivityLog, admin_site=None)
        assert admin.linked_actor_object(activity_log) == "-"

    def test_linked_object_object_happy_path(self, activity_log: ActivityLog) -> None:
        admin = ActivityLogAdmin(ActivityLog, admin_site=None)
        activity_object_object = admin.linked_object_object(activity_log)
        soup = bs4(activity_object_object, "html.parser")
        link = soup.find(class_=LINKED_OBJECT_CLASSNAME)
        assert link["href"] == reverse(
            "admin:contributions_contribution_change", args=[activity_log.activity_object_content_object.pk]
        )
        assert (
            link.text
            == f"{activity_log.activity_object_content_object.__class__.__name__} #{activity_log.activity_object_content_object.pk}"
        )

    def test_linked_object_object_when_no_url(
        self, activity_log: ActivityLog, mocker: pytest_mock.MockerFixture
    ) -> None:
        mocker.patch("apps.activity_log.admin.ActivityLogAdmin._get_admin_url_for_linked_object", return_value=None)
        admin = ActivityLogAdmin(ActivityLog, admin_site=None)
        assert admin.linked_object_object(activity_log) == "-"
