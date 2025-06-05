from django.template import TemplateDoesNotExist
from django.urls import reverse

import pytest
from rest_framework.test import APIClient, APIRequestFactory

from apps.emails.models import EmailCustomization
from apps.organizations.models import Organization, RevenueProgram
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.users.models import User

from ..views import preview_contribution_email_template


@pytest.mark.django_db
class TestPreviewContributionEmailHappyPath:
    @pytest.mark.parametrize(
        "template_name",
        [
            "recurring-contribution-email-reminder.html",
            "recurring-contribution-email-reminder.txt",
            "recurring-contribution-canceled.html",
            "recurring-contribution-canceled.txt",
            "recurring-contribution-payment-updated.html",
            "recurring-contribution-payment-updated.txt",
            "nrh-default-contribution-confirmation-email.html",
            "nrh-default-contribution-confirmation-email.txt",
        ],
    )
    @pytest.mark.parametrize("logo_url", ["truthy", None])
    def test_responds_200(self, template_name, logo_url):
        rp = RevenueProgramFactory()
        query = f"/?rp_id={rp.id}"
        if logo_url:
            query += f"&logo_url={logo_url}"
        assert (
            preview_contribution_email_template(APIRequestFactory().get(query), template_name=template_name).status_code
            == 200
        )


@pytest.mark.django_db
class TestPreviewContributionEmailUnhappyPath:
    def test_responds_400_when_nonpermitted_template(self):
        rp = RevenueProgramFactory()
        assert (
            preview_contribution_email_template(
                APIRequestFactory().get(f"/?rp_id={rp.id}"), template_name="bad"
            ).status_code
            == 400
        )

    def test_responds_404_when_template_not_found(self, mocker):
        mocker.patch("apps.emails.views.get_template", side_effect=TemplateDoesNotExist(""))
        rp = RevenueProgramFactory()
        assert (
            preview_contribution_email_template(
                APIRequestFactory().get(f"/?rp_id={rp.id}"), template_name="recurring-contribution-email-reminder.html"
            ).status_code
            == 404
        )

    def test_responds_400_when_rp_id_omitted(self):
        assert (
            preview_contribution_email_template(
                APIRequestFactory().get(""), template_name="recurring-contribution-email-reminder.html"
            ).status_code
            == 400
        )

    def test_responds_404_when_rp_doesnt_exist(self):
        assert (
            preview_contribution_email_template(
                APIRequestFactory().get("/?rp_id=1"), template_name="recurring-contribution-email-reminder.html"
            ).status_code
            == 404
        )


@pytest.mark.django_db
class TestEmailCustomizationViewSet:

    @pytest.fixture
    def org_user(self, org_user_multiple_rps: User, revenue_program: RevenueProgram):
        org_user_multiple_rps.roleassignment.organization = revenue_program.organization
        org_user_multiple_rps.roleassignment.save()
        org_user_multiple_rps.refresh_from_db()
        return org_user_multiple_rps

    @pytest.fixture
    def rp_user(self, rp_user: User, revenue_program: RevenueProgram):
        rp_user.roleassignment.organization = revenue_program.organization
        rp_user.roleassignment.revenue_programs.set([revenue_program])
        rp_user.roleassignment.save()
        rp_user.refresh_from_db()
        return rp_user

    @pytest.fixture
    def email_customization(self, revenue_program: RevenueProgram, email_customization: EmailCustomization):
        # Ensure the email customization is associated with the given revenue program
        email_customization.revenue_program = revenue_program
        email_customization.save()
        return email_customization

    @pytest.fixture
    def another_org(self, org_user: User) -> Organization:
        org = OrganizationFactory()
        assert org_user.roleassignment.organization != org
        return org

    @pytest.fixture
    def another_rp(self, revenue_program: RevenueProgram) -> RevenueProgram:
        return RevenueProgramFactory(organization=revenue_program.organization)

    @pytest.fixture
    def another_orgs_email_customization(self, another_org: Organization) -> EmailCustomization:
        other_revenue_program = RevenueProgramFactory(organization=another_org)
        return EmailCustomization.objects.create(
            revenue_program=other_revenue_program,
            email_type=EmailCustomization.EmailType.CONTRIBUTION_RECEIPT,
            email_block=EmailCustomization.EmailBlock.MESSAGE,
            content_html="<p>Test content</p>",
        )

    @pytest.fixture
    def another_rps_email_customization(self, another_rp: RevenueProgram) -> EmailCustomization:
        return EmailCustomization.objects.create(
            revenue_program=another_rp,
            email_type=EmailCustomization.EmailType.CONTRIBUTION_RECEIPT,
            email_block=EmailCustomization.EmailBlock.MESSAGE,
            content_html="<p>Test content</p>",
        )

    @pytest.mark.parametrize("user_fixture", ["hub_admin_user", "org_user", "rp_user"])
    def test_can_retrieve_by_id(
        self,
        api_client: APIClient,
        email_customization: EmailCustomization,
        request: pytest.FixtureRequest,
        user_fixture: str,
    ):
        user = request.getfixturevalue(user_fixture)
        api_client.force_authenticate(user=user)
        response = api_client.get(reverse("email-customization-detail", kwargs={"pk": email_customization.pk}))
        assert response.status_code == 200
        assert response.json()["id"] == email_customization.id
        assert response.json()["revenue_program"] == email_customization.revenue_program.id
        assert response.json()["email_type"] == email_customization.email_type.value
        assert response.json()["email_block"] == email_customization.email_block.value
        assert response.json()["content_html"] == email_customization.content_html
        assert response.json()["content_plain_text"] == email_customization.content_plain_text

    @pytest.mark.parametrize(
        ("user_fixture", "customization_fixture"),
        [("org_user", "another_orgs_email_customization"), ("rp_user", "another_rps_email_customization")],
    )
    def test_cannot_retrieve_unowned(
        self,
        api_client: APIClient,
        request: pytest.FixtureRequest,
        user_fixture: str,
        customization_fixture: str,
    ):
        user = request.getfixturevalue(user_fixture)
        customization = request.getfixturevalue(customization_fixture)
        api_client.force_authenticate(user=user)
        response = api_client.get(reverse("email-customization-detail", args=(str(customization.pk),)))
        assert response.status_code == 404
        assert response.json() == {"detail": "No EmailCustomization matches the given query."}

    @pytest.mark.parametrize("user_fixture", ["hub_admin_user", "org_user", "rp_user"])
    def test_can_list(
        self,
        api_client: APIClient,
        email_customization: EmailCustomization,
        another_orgs_email_customization: EmailCustomization,
        another_rps_email_customization: EmailCustomization,
        request: pytest.FixtureRequest,
        user_fixture: str,
    ):
        user = request.getfixturevalue(user_fixture)
        api_client.force_authenticate(user=user)
        response = api_client.get(reverse("email-customization-list"))
        assert response.status_code == 200
        match user_fixture:
            case "hub_admin_user":
                assert response.json()["count"] == 3
                assert {item["id"] for item in response.json()["results"]} == {
                    email_customization.id,
                    another_orgs_email_customization.id,
                    another_rps_email_customization.id,
                }
            case "org_user":
                assert response.json()["count"] == 2
                assert {item["id"] for item in response.json()["results"]} == {
                    email_customization.id,
                    another_rps_email_customization.id,
                }
            case "rp_user":
                assert response.json()["count"] == 1
                assert response.json()["results"][0]["id"] == email_customization.id

    @pytest.mark.parametrize(
        ("user_fixture", "customization_fixture"),
        [
            ("hub_admin_user", "another_orgs_email_customization"),
            ("org_user", "another_rps_email_customization"),
            ("rp_user", "email_customization"),
        ],
    )
    def test_can_filter_by_revenue_program(
        self,
        api_client: APIClient,
        user_fixture: str,
        customization_fixture: str,
        request: pytest.FixtureRequest,
    ):
        user = request.getfixturevalue(user_fixture)
        customization = request.getfixturevalue(customization_fixture)
        api_client.force_authenticate(user=user)
        response = api_client.get(
            reverse("email-customization-list") + f"?revenue_program={customization.revenue_program.pk}",
        )
        assert response.status_code == 200
        assert response.json()["count"]
        assert (
            response.json()["count"]
            == EmailCustomization.objects.filter(revenue_program=customization.revenue_program).count()
        )
        assert {item["id"] for item in response.json()["results"]} == set(
            EmailCustomization.objects.filter(revenue_program=customization.revenue_program).values_list(
                "id", flat=True
            )
        )

    def test_filter_when_revenue_program_does_not_exist(self, api_client: APIClient, hub_admin_user: User):
        api_client.force_authenticate(user=hub_admin_user)
        response = api_client.get(reverse("email-customization-list") + "?revenue_program=999999")
        assert response.status_code == 200
        assert response.json()["count"] == 0
        assert response.json()["results"] == []

    def test_filter_when_revenue_program_unowned(
        self, api_client: APIClient, another_orgs_email_customization: EmailCustomization, org_user: User
    ):
        api_client.force_authenticate(user=org_user)
        response = api_client.get(
            reverse("email-customization-list")
            + f"?revenue_program={another_orgs_email_customization.revenue_program.pk}"
        )
        assert response.status_code == 200
        assert response.json()["count"] == 0
        assert response.json()["results"] == []

    @pytest.mark.parametrize("user_fixture", ["hub_admin_user", "org_user", "rp_user"])
    def test_can_create(
        self, api_client: APIClient, revenue_program: RevenueProgram, request: pytest.FixtureRequest, user_fixture: str
    ):
        user = request.getfixturevalue(user_fixture)
        api_client.force_authenticate(user=user)
        data = {
            "revenue_program": revenue_program.id,
            "email_type": EmailCustomization.EmailType.CONTRIBUTION_RECEIPT.value,
            "email_block": EmailCustomization.EmailBlock.MESSAGE.value,
            "content_html": "<p>Test HTML content</p>",
        }
        response = api_client.post(reverse("email-customization-list"), data=data)
        assert response.status_code == 201
        assert response.json()["revenue_program"] == revenue_program.id
        assert response.json()["email_type"] == EmailCustomization.EmailType.CONTRIBUTION_RECEIPT.value
        assert response.json()["email_block"] == EmailCustomization.EmailBlock.MESSAGE.value
        assert response.json()["content_html"] == data["content_html"]

    @pytest.mark.parametrize(
        ("user_fixture", "rp_fixture"),
        [("org_user", "another_orgs_email_customization"), ("rp_user", "another_rps_email_customization")],
    )
    def test_cannot_create_referencing_unowned_rp(
        self, user_fixture: str, rp_fixture: str, api_client: APIClient, request: pytest.FixtureRequest
    ) -> None:
        user = request.getfixturevalue(user_fixture)
        api_client.force_authenticate(user=user)
        rp = request.getfixturevalue(rp_fixture)
        data = {
            "revenue_program": rp.id,
            "email_type": EmailCustomization.EmailType.CONTRIBUTION_RECEIPT.value,
            "email_block": EmailCustomization.EmailBlock.MESSAGE.value,
            "content_html": "<p>Test HTML content</p>",
        }
        response = api_client.post(reverse("email-customization-list"), data=data)
        assert response.status_code == 400
        assert response.json()["revenue_program"][0] == f'Invalid pk "{rp.id}" - object does not exist.'

    @pytest.mark.parametrize("user_fixture", ["hub_admin_user", "org_user", "rp_user"])
    def test_can_update(
        self,
        api_client: APIClient,
        email_customization: EmailCustomization,
        request: pytest.FixtureRequest,
        user_fixture: str,
    ):
        user = request.getfixturevalue(user_fixture)
        api_client.force_authenticate(user=user)
        data = {"content_html": "<p>Updated HTML content</p>"}
        assert email_customization.content_html != data["content_html"]
        response = api_client.patch(
            reverse("email-customization-detail", args=(str(email_customization.pk),)), data=data
        )
        assert response.status_code == 200
        assert response.data["content_html"] == data["content_html"]

    @pytest.mark.parametrize(
        ("user_fixture", "rp_fixture"),
        [("org_user", "another_orgs_email_customization"), ("rp_user", "another_rps_email_customization")],
    )
    def test_cannot_update_to_unowned_rp(
        self,
        api_client: APIClient,
        email_customization: EmailCustomization,
        request: pytest.FixtureRequest,
        user_fixture: str,
        rp_fixture: str,
    ):
        user = request.getfixturevalue(user_fixture)
        rp = request.getfixturevalue(rp_fixture)
        api_client.force_authenticate(user=user)
        data = {"revenue_program": rp.id}
        response = api_client.patch(
            reverse("email-customization-detail", args=(str(email_customization.pk),)), data=data
        )
        assert response.status_code == 400
        assert response.json()["revenue_program"][0] == f'Invalid pk "{rp.id}" - object does not exist.'

    @pytest.mark.parametrize("user_fixture", ["hub_admin_user", "org_user", "rp_user"])
    def test_can_delete(
        self,
        api_client: APIClient,
        email_customization: EmailCustomization,
        user_fixture: str,
        request: pytest.FixtureRequest,
    ):
        user = request.getfixturevalue(user_fixture)
        api_client.force_authenticate(user=user)
        response = api_client.delete(reverse("email-customization-detail", args=(str(email_customization.pk),)))
        assert response.status_code == 204
        assert EmailCustomization.objects.filter(id=email_customization.id).count() == 0

    @pytest.mark.parametrize(
        ("user_fixture", "customization_fixture"),
        [("org_user", "another_orgs_email_customization"), ("rp_user", "another_rps_email_customization")],
    )
    def test_cannot_delete_unowned(
        self,
        api_client: APIClient,
        email_customization: EmailCustomization,
        request: pytest.FixtureRequest,
        user_fixture: str,
        customization_fixture: str,
    ):
        user = request.getfixturevalue(user_fixture)
        customization = request.getfixturevalue(customization_fixture)
        api_client.force_authenticate(user=user)
        response = api_client.delete(reverse("email-customization-detail", args=(str(email_customization.pk),)))
        assert response.status_code == 204
        assert EmailCustomization.objects.filter(id=customization.id).exists()

    def test_cannot_create_when_uniqueness_constraint_violated(
        self, api_client: APIClient, email_customization: EmailCustomization, hub_admin_user: User
    ):
        data = {
            "revenue_program": str(email_customization.revenue_program.id),
            "email_type": email_customization.email_type,
            "email_block": email_customization.email_block,
            "content_html": "<p>Test HTML content</p>",
        }
        api_client.force_authenticate(user=hub_admin_user)
        response = api_client.post(reverse("email-customization-list"), data=data)
        assert response.status_code == 400
        assert (
            response.json()["non_field_errors"][0]
            == "The fields revenue_program, email_type, email_block must make a unique set."
        )
