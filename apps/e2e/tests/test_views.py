import pytest

from apps.users.tests.factories import UserFactory


@pytest.mark.django_db()
class TestE2EViewSet:

    @pytest.fixture()
    def e2e_user(self, settings):
        user = UserFactory()
        settings.E2E_USER = user.email
        return user

    @pytest.fixture(params=["e2e_user", "superuser"])
    def user(self, request):
        return request.param

    def test_get(self, api_client, user):
        api_client.force_authenticate(user=user)
        response = api_client.get("/e2e/")
        if user.email == "e2e_user":
            assert response.status_code == 200
            assert response.data == {"tests": ["test1", "test2"]}
        else:
            assert response.status_code == 403

    def test_post(self, api_client, user):
        api_client.force_authenticate(user=user)
        response = api_client.post("/e2e/")
        if user.email == "e2e_user":
            assert response.status_code == 200
            assert response.data == {"status": "success"}
        else:
            assert response.status_code == 403
