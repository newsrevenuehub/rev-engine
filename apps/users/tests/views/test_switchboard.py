import pytest
from rest_framework import status
from rest_framework.reverse import reverse

from apps.users.models import User


@pytest.mark.django_db
class TestSwitchboardUsersViewSet:
    @pytest.mark.parametrize("exists", [True, False])
    def test_retrieve_by_id(self, api_client, switchboard_api_token, org_user_multiple_rps: User, exists):
        pk = org_user_multiple_rps.id
        if not exists:
            org_user_multiple_rps.delete()
        response = api_client.get(
            reverse("switchboard-user-detail", args=(pk,)),
            headers={"Authorization": f"Token {switchboard_api_token}"},
        )
        if exists:
            assert response.status_code == status.HTTP_200_OK
            assert response.json() == {
                "email": org_user_multiple_rps.email,
                "first_name": org_user_multiple_rps.first_name,
                "id": pk,
                "job_title": org_user_multiple_rps.job_title,
                "last_name": org_user_multiple_rps.last_name,
                "role": {
                    "type": org_user_multiple_rps.role_type[0],
                    "organizations": [org.id for org in org_user_multiple_rps.permitted_organizations],
                    "revenue_programs": [org.id for org in org_user_multiple_rps.permitted_revenue_programs],
                },
            }
        else:
            assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.parametrize("exists", [True, False])
    def test_retrieve_by_email(self, api_client, switchboard_api_token, org_user_multiple_rps, exists):
        email = org_user_multiple_rps.email
        if not exists:
            org_user_multiple_rps.delete()
        response = api_client.get(
            reverse("switchboard-user-get-by-email", args=(email,)),
            headers={"Authorization": f"Token {switchboard_api_token}"},
        )
        if exists:
            assert response.status_code == status.HTTP_200_OK
            assert response.json() == {
                "email": email,
                "first_name": org_user_multiple_rps.first_name,
                "id": org_user_multiple_rps.id,
                "job_title": org_user_multiple_rps.job_title,
                "last_name": org_user_multiple_rps.last_name,
                "role": {
                    "type": org_user_multiple_rps.role_type[0],
                    "organizations": [org.id for org in org_user_multiple_rps.permitted_organizations],
                    "revenue_programs": [org.id for org in org_user_multiple_rps.permitted_revenue_programs],
                },
            }
        else:
            assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.parametrize("url_name", ["switchboard-user-get-by-email", "switchboard-user-detail"])
    @pytest.mark.parametrize(
        ("token_fixture", "expect_success"), [("switchboard_api_token", True), ("switchboard_api_expired_token", False)]
    )
    def test_only_works_with_valid_token(
        self, url_name, token_fixture, expect_success, api_client, request, org_user_multiple_rps
    ):
        token = request.getfixturevalue(token_fixture)
        url_arg = (
            org_user_multiple_rps.email if url_name == "switchboard-user-get-by-email" else org_user_multiple_rps.id
        )
        response = api_client.get(
            reverse(url_name, args=(url_arg,)),
            headers={"Authorization": f"Token {token}"},
        )

        if expect_success:
            assert response.status_code == status.HTTP_200_OK
        else:
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
