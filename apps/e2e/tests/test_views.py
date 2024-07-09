from django.urls import reverse

import pytest
from bs4 import BeautifulSoup

from apps.e2e.tests.factories import CommitStatusFactory
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db()
class TestE2EViewSet:

    @pytest.fixture()
    def e2e_user(self, settings):
        user = UserFactory()
        settings.E2E_USER = user.email
        return user

    @pytest.fixture()
    def commit_status(self):
        return CommitStatusFactory()

    def test_get(self, client, commit_status):
        response = client.get(reverse("e2e-detail", args=(commit_status.commit_sha, commit_status.github_id)))
        assert response.status_code == 200
        soup = BeautifulSoup(response.content, "html.parser")
        assert soup.find("title").text == f"Commit Status {commit_status.id}"
