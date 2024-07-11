from django.urls import reverse

import pytest
from bs4 import BeautifulSoup


@pytest.mark.django_db()
class Test_commit_status_detail:
    def test_happy_path(self, client, commit_status, settings):
        settings.E2E_ENABLED = True
        response = client.get(reverse("e2e-detail", args=(commit_status.commit_sha, commit_status.id)))
        assert response.status_code == 200
        soup = BeautifulSoup(response.content, "html.parser")
        assert soup.find("title").text == f"Commit Status {commit_status.id}"
