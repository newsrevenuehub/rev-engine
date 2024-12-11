from datetime import timedelta

from django.utils.timezone import now

import pytest
from knox.models import AuthToken
from rest_framework import status
from rest_framework.reverse import reverse

from apps.contributions.models import Contributor
from apps.contributions.tests.factories import (
    ContributionFactory,
    ContributorFactory,
)
from apps.organizations.tests.factories import (
    OrganizationFactory,
    RevenueProgramFactory,
)
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestSwitchboardContributorsViewSet:

    @pytest.fixture
    def token(self, switchboard_user):
        return AuthToken.objects.create(switchboard_user)[1]

    @pytest.fixture
    def expired_token(self, api_client, switchboard_user, switchboard_password, monkeypatch, settings):
        token, token_string = AuthToken.objects.create(switchboard_user)
        token.expiry = now() - timedelta(days=1)
        token.save()
        return token_string

    @pytest.mark.parametrize("already_exists", [True, False])
    def test_create(self, api_client, faker, already_exists, token):
        email = faker.email()
        if already_exists:
            existing = ContributorFactory(email=email)
        response = api_client.post(
            reverse("switchboard-contributor-list"),
            data={"email": email},
            headers={"Authorization": f"Token {token}"},
        )
        if already_exists:
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert response.json() == {"error": f"A contributor (ID: {existing.id}) with email {email} already exists"}
        else:
            assert response.status_code == status.HTTP_201_CREATED
            contributor = Contributor.objects.get(email=email)
            assert response.json() == {"email": email, "id": contributor.id}

    @pytest.fixture
    def contributor(self):
        return ContributorFactory()

    @pytest.mark.parametrize("exists", [True, False])
    def test_retrieve(self, api_client, token, contributor, exists):
        email = contributor.email
        if not exists:
            contributor.delete()
        response = api_client.get(
            reverse("switchboard-contributor-detail", args=(email,)),
            headers={"Authorization": f"Token {token}"},
        )
        if exists:
            assert response.status_code == status.HTTP_200_OK
            assert response.json() == {"email": email, "id": contributor.id}
        else:
            assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.fixture
    def retrieve_config(self, contributor):
        return {
            "method": "get",
            "url": reverse("switchboard-contributor-detail", args=(contributor.email,)),
            "data": None,
        }

    @pytest.fixture
    def create_config(self, faker):
        return {"method": "post", "url": reverse("switchboard-contributor-list"), "data": {"email": faker.email()}}

    @pytest.mark.parametrize("case_config", ["retrieve_config", "create_config"])
    @pytest.mark.parametrize(("token_fixture", "expect_success"), [("token", True), ("expired_token", False)])
    def test_only_works_with_valid_token(self, case_config, token_fixture, expect_success, api_client, request):
        token = request.getfixturevalue(token_fixture)
        config = request.getfixturevalue(case_config)

        def _make_request(method, url, data):
            kwargs = {"headers": {}}
            if token:
                kwargs["headers"]["Authorization"] = f"Token {token}"
            if data:
                kwargs["data"] = data
            return getattr(api_client, method)(url, **kwargs)

        response = _make_request(config["method"], config["url"], config["data"])

        if expect_success:
            assert response.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED)
        else:
            assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestSwitchboardContributionsViewSet:

    @pytest.fixture
    def other_user(self):
        return UserFactory(is_superuser=True)

    @pytest.fixture
    def organization(self):
        return OrganizationFactory()

    @pytest.fixture
    def rp_1(self, organization):
        return RevenueProgramFactory(organization=organization)

    @pytest.fixture
    def rp_2(self, organization):
        return RevenueProgramFactory(organization=organization)

    @pytest.fixture
    def other_orgs_rp(self):
        return RevenueProgramFactory()

    @pytest.fixture
    def contribution_with_donation_page(self, rp_1):
        return ContributionFactory(donation_page__revenue_program=rp_1)

    @pytest.fixture
    def contribution_without_donation_page(self, rp_1):
        return ContributionFactory(donation_page=None, _revenue_program=rp_1)

    @pytest.fixture(params=["contribution_with_donation_page", "contribution_without_donation_page"])
    def contribution(self, request):
        return request.getfixturevalue(request.param)

    @pytest.mark.parametrize(
        "request_has_revenue_program",
        [
            True,
            False,
        ],
    )
    @pytest.mark.parametrize(
        "instance_has_donation_page",
        [
            True,
            False,
        ],
    )
    def test_update_revenue_program_happy_path(
        self,
        request_has_revenue_program,
        instance_has_donation_page,
        api_client,
        rp_2,
        rp_1,
        contribution,
        switchboard_user,
    ):
        body = {"revenue_program": rp_2.id} if request_has_revenue_program else {}
        if not instance_has_donation_page:
            contribution.donation_page = None
            contribution._revenue_program = rp_1
            contribution.save()
        api_client.force_authenticate(switchboard_user)
        response = api_client.patch(reverse("switchboard-contribution-detail", args=(contribution.id,)), data=body)
        assert response.status_code == status.HTTP_200_OK
        contribution.refresh_from_db()
        if request_has_revenue_program:
            assert contribution._revenue_program == rp_2

    def test_update_when_not_switchboard_user(self, api_client, other_user, contribution):
        api_client.force_authenticate(other_user)
        response = api_client.patch(reverse("switchboard-contribution-detail", args=(contribution.id,)))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_when_patching_rp_for_different_org(self, api_client, switchboard_user, contribution, other_orgs_rp):
        api_client.force_authenticate(switchboard_user)
        assert contribution.revenue_program.organization != other_orgs_rp.organization
        response = api_client.patch(
            reverse("switchboard-contribution-detail", args=(contribution.id,)),
            data={"revenue_program": other_orgs_rp.id},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {
            "revenue_program": ["Cannot assign contribution to a revenue program from a different organization"]
        }
