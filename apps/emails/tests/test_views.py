from django.template import TemplateDoesNotExist
from django.urls import reverse
from django.utils import timezone

import pytest
import pytest_mock
from knox.auth import TokenAuthentication
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory

from apps.api.permissions import IsSwitchboardAccount
from apps.contributions.models import Contribution
from apps.emails.models import EmailCustomization, TransactionalEmailNames, TransactionalEmailRecord
from apps.emails.views import TriggerTransactionalEmailViewSet
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
    def another_orgs_email_customization(self, another_org: Organization, org_user: User) -> EmailCustomization:
        other_revenue_program = RevenueProgramFactory(organization=another_org)
        customization = EmailCustomization.objects.create(
            revenue_program=other_revenue_program,
            email_type=TransactionalEmailNames.CONTRIBUTION_RECEIPT,
            email_block=EmailCustomization.EmailBlock.MESSAGE,
            content_html="<p>Test content</p>",
        )
        assert customization.revenue_program.organization != org_user.roleassignment.organization
        return customization

    @pytest.fixture
    def another_rps_email_customization(self, another_rp: RevenueProgram) -> EmailCustomization:
        return EmailCustomization.objects.create(
            revenue_program=another_rp,
            email_type=TransactionalEmailNames.CONTRIBUTION_RECEIPT,
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
        assert response.json() == {"detail": "Not found."}

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
        result_count = len(response.json())
        match user_fixture:
            case "hub_admin_user":
                assert result_count == 3
                assert {item["id"] for item in response.json()} == {
                    email_customization.id,
                    another_orgs_email_customization.id,
                    another_rps_email_customization.id,
                }
            case "org_user":
                assert result_count == 2
                assert {item["id"] for item in response.json()} == {
                    email_customization.id,
                    another_rps_email_customization.id,
                }
            case "rp_user":
                assert result_count == 1
                assert response.json()[0]["id"] == email_customization.id

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
        assert (length := len(response.json()))
        assert length == EmailCustomization.objects.filter(revenue_program=customization.revenue_program).count()
        assert {item["id"] for item in response.json()} == set(
            EmailCustomization.objects.filter(revenue_program=customization.revenue_program).values_list(
                "id", flat=True
            )
        )

    def test_filter_when_revenue_program_does_not_exist(self, api_client: APIClient, hub_admin_user: User):
        api_client.force_authenticate(user=hub_admin_user)
        response = api_client.get(reverse("email-customization-list") + "?revenue_program=999999")
        assert response.status_code == 200
        assert response.json() == []

    def test_filter_when_revenue_program_unowned(
        self, api_client: APIClient, another_orgs_email_customization: EmailCustomization, org_user: User
    ):
        api_client.force_authenticate(user=org_user)
        response = api_client.get(
            reverse("email-customization-list")
            + f"?revenue_program={another_orgs_email_customization.revenue_program.pk}"
        )
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.parametrize("user_fixture", ["hub_admin_user", "org_user", "rp_user"])
    def test_can_create(
        self, api_client: APIClient, revenue_program: RevenueProgram, request: pytest.FixtureRequest, user_fixture: str
    ):
        user = request.getfixturevalue(user_fixture)
        api_client.force_authenticate(user=user)
        data = {
            "revenue_program": revenue_program.id,
            "email_type": TransactionalEmailNames.CONTRIBUTION_RECEIPT.value,
            "email_block": EmailCustomization.EmailBlock.MESSAGE.value,
            "content_html": "<p>Test HTML content</p>",
        }
        response = api_client.post(reverse("email-customization-list"), data=data)
        assert response.status_code == 201
        assert response.json()["revenue_program"] == revenue_program.id
        assert response.json()["email_type"] == TransactionalEmailNames.CONTRIBUTION_RECEIPT.value
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
            "email_type": TransactionalEmailNames.CONTRIBUTION_RECEIPT.value,
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
        request: pytest.FixtureRequest,
        user_fixture: str,
        customization_fixture: str,
    ):
        user = request.getfixturevalue(user_fixture)
        customization = request.getfixturevalue(customization_fixture)
        api_client.force_authenticate(user=user)
        cust_id = customization.id
        response = api_client.delete(reverse("email-customization-detail", args=(str(cust_id),)))
        assert response.status_code == 404
        assert response.json() == {"detail": "Not found."}
        assert EmailCustomization.objects.filter(id=cust_id).exists()

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


@pytest.mark.django_db
class TestTriggerTransactionalEmailViewSet:

    def test_trigger_annual_payment_reminder_happy_path(
        self,
        api_client: APIClient,
        switchboard_user: User,
        annual_contribution: "Contribution",
        mocker: pytest_mock.MockerFixture,
        now: timezone.datetime,
    ):
        api_client.force_authenticate(user=switchboard_user)
        uid = "unique-id-123"
        next_charge_date = now.date()
        query = TransactionalEmailRecord.objects.filter(
            contribution=annual_contribution,
            name=TransactionalEmailNames.ANNUAL_PAYMENT_REMINDER,
            unique_identifier=uid,
        )
        assert not query.exists()
        mock_send_mail = mocker.patch("apps.contributions.models.Contribution.send_recurring_contribution_change_email")
        response = api_client.post(
            reverse("switchboard-trigger-email-trigger-annual-payment-reminder"),
            data={
                "contribution": annual_contribution.pk,
                "unique_identifier": uid,
                "next_charge_date": next_charge_date.isoformat(),
            },
            format="json",
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert query.exists()
        assert query.count() == 1
        mock_send_mail.assert_called_once_with(
            f"Reminder: {annual_contribution.revenue_program.name} scheduled contribution",
            "recurring-contribution-email-reminder",
            next_charge_date,
        )

    def test_trigger_annual_payment_reminder_missing_fields(
        self,
        api_client: APIClient,
        switchboard_user: User,
    ):
        api_client.force_authenticate(user=switchboard_user)
        response = api_client.post(
            reverse("switchboard-trigger-email-trigger-annual-payment-reminder"),
            data={
                "contribution": None,
                "unique_identifier": None,
                "next_charge_date": None,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {
            "contribution": ["This field may not be null."],
            "unique_identifier": ["This field may not be null."],
            "next_charge_date": ["This field may not be null."],
        }

    @pytest.mark.parametrize("contribution_fixture", ["one_time_contribution", "monthly_contribution"])
    def test_trigger_annual_payment_reminder_when_wrong_interval(
        self,
        api_client: APIClient,
        switchboard_user: User,
        contribution_fixture: str,
        request: pytest.FixtureRequest,
    ):
        contribution = request.getfixturevalue(contribution_fixture)
        api_client.force_authenticate(user=switchboard_user)
        response = api_client.post(
            reverse("switchboard-trigger-email-trigger-annual-payment-reminder"),
            data={
                "contribution": contribution.pk,
                "unique_identifier": "unique-id-123",
                "next_charge_date": timezone.now().date().isoformat(),
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {
            "contribution": [
                f"Contribution must be yearly for email type '{TransactionalEmailNames.ANNUAL_PAYMENT_REMINDER.value}'. "
                f"Current contribution interval is {contribution.interval}."
            ]
        }

    def test_has_expected_permissions_class(self):
        assert TriggerTransactionalEmailViewSet.permission_classes == [IsSwitchboardAccount]

    def test_has_expected_authentication_class(self):
        assert TriggerTransactionalEmailViewSet.authentication_classes == [TokenAuthentication]
