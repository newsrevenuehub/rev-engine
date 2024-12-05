import pytest
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
    @pytest.mark.parametrize("already_exists", [True, False])
    def test_create(self, api_client, switchboard_user, faker, already_exists):
        email = faker.email()
        if already_exists:
            existing = ContributorFactory(email=email)
        # note on why
        api_client.login(email=switchboard_user.email, password="password")
        api_client.enforce_csrf = True
        response = api_client.post(
            reverse("switchboard-contributor-list"),
            data={"email": email},
        )
        if already_exists:
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert response.json() == {"error": f"A contributor (ID: {existing.id}) with this email already exists"}
        else:
            assert response.status_code == status.HTTP_201_CREATED
            contributor = Contributor.objects.get(email=email)
            assert response.json() == {"email": email, "id": contributor.id}


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
