from django.urls import reverse

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.organizations.models import Organization
from apps.users.models import User


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("user_fixture", "permitted"),
    [
        ("switchboard_user", True),
        ("org_user_free_plan", False),
        ("hub_admin_user", False),
        ("superuser", False),
    ],
)
def test_switchboard_rp_activecampaign_detail(request, user_fixture, permitted, api_client, revenue_program, mocker):
    mocker.patch(
        "apps.organizations.models.RevenueProgram.publish_revenue_program_activecampaign_configuration_complete"
    )
    revenue_program.activecampaign_server_url = "https://foo.bar"
    revenue_program.save()
    mocker.patch(
        "apps.organizations.models.RevenueProgram.activecampaign_integration_connected",
        return_value=(is_connected := True),
        new_callable=mocker.PropertyMock,
    )
    user = request.getfixturevalue(user_fixture)
    api_client.force_authenticate(user)
    response = api_client.get(reverse("switchboard-revenue-program-activecampaign-detail", args=(revenue_program.pk,)))
    assert response.status_code == (status.HTTP_200_OK if permitted else status.HTTP_403_FORBIDDEN)
    if permitted:
        assert response.json() == {
            "id": revenue_program.id,
            "name": revenue_program.name,
            "slug": revenue_program.slug,
            "stripe_account_id": revenue_program.payment_provider.stripe_account_id,
            "activecampaign_integration_connected": is_connected,
            "activecampaign_server_url": revenue_program.activecampaign_server_url,
        }


@pytest.mark.django_db
class TestOrganizationViewSetSwitchboard:
    def test_get_all_organizations(self, api_client: APIClient, switchboard_user: User, organization: Organization):
        api_client.force_authenticate(user=switchboard_user)
        url = reverse("switchboard-organization-list")
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == organization.id

    def test_get_organization_by_id(self, api_client: APIClient, switchboard_user: User, organization: Organization):
        api_client.force_authenticate(user=switchboard_user)
        url = reverse("switchboard-organization-detail", kwargs={"pk": organization.id})
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data["id"] == organization.id
        assert response.data["name"] == organization.name
        assert response.data["plan_name"] == organization.plan_name
        assert response.data["slug"] == organization.slug
        assert response.data["stripe_subscription_id"] == organization.stripe_subscription_id

    def test_get_organization_by_slug(self, api_client: APIClient, switchboard_user: User, organization: Organization):
        api_client.force_authenticate(user=switchboard_user)
        url = reverse("switchboard-organization-get-by-slug", kwargs={"slug": organization.slug})
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data["id"] == organization.id
        assert response.data["name"] == organization.name
        assert response.data["slug"] == organization.slug

    def test_get_organization_by_subscription_id(
        self, api_client: APIClient, switchboard_user: User, organization: Organization
    ):
        organization.stripe_subscription_id = "sub_123456789"
        organization.save()

        api_client.force_authenticate(user=switchboard_user)
        url = reverse(
            "switchboard-organization-get-by-subscription-id",
            kwargs={"subscription_id": organization.stripe_subscription_id},
        )
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data["id"] == organization.id
        assert response.data["name"] == organization.name
        assert response.data["stripe_subscription_id"] == organization.stripe_subscription_id

    def test_get_non_existent_organization_returns_404(self, api_client: APIClient, switchboard_user: User):
        api_client.force_authenticate(user=switchboard_user)
        url = reverse("switchboard-organization-detail", kwargs={"pk": 999999})
        response = api_client.get(url)
        assert response.status_code == 404

    def test_get_organization_by_non_existent_slug_returns_404(self, api_client: APIClient, switchboard_user: User):
        api_client.force_authenticate(user=switchboard_user)
        url = reverse("switchboard-organization-get-by-slug", kwargs={"slug": "non-existent-slug"})
        response = api_client.get(url)
        assert response.status_code == 404

    def test_get_organization_by_non_existent_subscription_id_returns_404(
        self, api_client: APIClient, switchboard_user: User
    ):
        api_client.force_authenticate(user=switchboard_user)
        url = reverse("switchboard-organization-get-by-subscription-id", kwargs={"subscription_id": "sub_nonexistent"})
        response = api_client.get(url)
        assert response.status_code == 404

    @pytest.mark.parametrize(
        ("search_term", "expected_count"),
        [
            ("existing", 2),
            ("nonexistent-organization", 0),
        ],
    )
    def test_get_organizations_by_name(
        self, api_client: APIClient, switchboard_user: User, organization: Organization, search_term, expected_count
    ):
        org2 = Organization.objects.create(
            name=f"{organization.name} Inc",
            slug=f"{organization.slug}-inc",
        )

        organization.name = "existing organization"
        organization.save()
        org2.name = "another existing org"
        org2.save()

        api_client.force_authenticate(user=switchboard_user)
        url = reverse("switchboard-organization-get-by-name", kwargs={"name": search_term})
        response = api_client.get(url)

        assert response.status_code == 200
        assert len(response.data) == expected_count

        if expected_count > 0:
            org_ids = [org["id"] for org in response.data]
            assert organization.id in org_ids
            assert org2.id in org_ids

    @pytest.mark.parametrize("authenticated", [True, False])
    @pytest.mark.parametrize(
        "url",
        [
            reverse("switchboard-organization-list"),
            reverse("switchboard-organization-detail", kwargs={"pk": 1}),
            reverse("switchboard-organization-get-by-slug", kwargs={"slug": "foo"}),
            reverse("switchboard-organization-get-by-subscription-id", kwargs={"subscription_id": "sub_123456789"}),
            reverse("switchboard-organization-get-by-name", kwargs={"name": "foo"}),
        ],
    )
    def test_user_no_access(self, api_client: APIClient, org_user_free_plan: User, url, authenticated):
        if authenticated:
            api_client.force_authenticate(user=org_user_free_plan)
        response = api_client.get(url)
        assert response.status_code == 403 if authenticated else 401
