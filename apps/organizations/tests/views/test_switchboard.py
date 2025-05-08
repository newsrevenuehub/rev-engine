from django.urls import reverse

import pytest
from rest_framework import status


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
