import json

from django.contrib.auth import get_user_model
from django.template.loader import render_to_string

import pytest
import stripe
from faker import Faker
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.permissions import AND, OR, IsAuthenticated
from rest_framework.reverse import reverse
from rest_framework.test import APIRequestFactory
from reversion.models import Version
from stripe.error import SignatureVerificationError, StripeError
from waffle import get_waffle_flag_model

from apps.api.permissions import HasRoleAssignment, IsHubAdmin, IsOrgAdmin
from apps.common.constants import MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME
from apps.common.secret_manager import GoogleCloudSecretProvider
from apps.emails.tasks import (
    make_send_test_contribution_email_data,
    make_send_test_magic_link_email_data,
    send_receipt_email,
    send_templated_email,
)
from apps.organizations.models import (
    TAX_ID_MAX_LENGTH,
    TAX_ID_MIN_LENGTH,
    CorePlan,
    FreePlan,
    Organization,
    OrganizationQuerySet,
    RevenueProgram,
    RevenueProgramQuerySet,
)
from apps.organizations.serializers import (
    MailchimpRevenueProgramForSpaConfiguration,
    MailchimpRevenueProgramForSwitchboard,
)
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.organizations.views import (
    FREE_TO_CORE_UPGRADE_EMAIL_SUBJECT,
    OrganizationViewSet,
    RevenueProgramViewSet,
    get_stripe_account_link_return_url,
    logger,
)
from apps.public.permissions import IsActiveSuperUser
from apps.users.choices import Roles
from apps.users.tests.factories import RoleAssignmentFactory


user_model = get_user_model()

fake = Faker()


@pytest.fixture
def org_valid_patch_data():
    return {"name": fake.pystr(min_chars=1, max_chars=Organization.name.field.max_length - 1)}


@pytest.fixture
def org_invalid_patch_data_name_too_long():
    return {
        "name": fake.pystr(
            min_chars=Organization.name.field.max_length + 1, max_chars=Organization.name.field.max_length + 100
        )
    }


@pytest.fixture
def stripe_checkout_process_completed(organization):
    return {
        "id": "evt_1234567890",
        "object": "event",
        "api_version": "2020-08-27",
        "created": 1569139579,
        "data": {
            "object": {
                "id": "cs_test_1234567890abcdef",
                "object": "checkout.session",
                "billing_address_collection": "required",
                "client_reference_id": str(organization.uuid),
                "customer": "cus_1234567890abcdef",
                "customer_email": "example@example.com",
                "display_items": [
                    {
                        "amount": 2000,
                        "currency": "usd",
                        "custom": {
                            "description": "Example Item",
                            "images": None,
                            "name": "Example Item",
                            "sku": "sku_1234567890abcdef",
                        },
                        "quantity": 1,
                        "type": "custom",
                    }
                ],
                "livemode": False,
                "locale": None,
                "metadata": {},
                "payment_intent": "pi_1234567890abcdef",
                "payment_method_types": ["card"],
                "subscription": "<some-sub-id>",
                "success_url": "https://example.com/success",
                "total_details": {"amount_discount": 0, "amount_tax": 0},
            }
        },
        "livemode": False,
        "type": "checkout.session.completed",
    }


@pytest.mark.django_db
@pytest.mark.usefixtures("default_feature_flags")
class TestOrganizationViewSet:
    @pytest.fixture(
        params=[
            "org_user_free_plan",
            "rp_user",
            "hub_admin_user",
            "superuser",
        ]
    )
    def user(self, request):
        return request.getfixturevalue(request.param)

    def test_retrieve_when_expected_user(self, user, api_client, mocker):
        """Show that expected users can retrieve only permitted organizations.

        NB: This test treats Organization.objects.filtered_by_role_assignment as a blackbox. That function is well-tested
        elsewhere.
        """
        # ensure there will be organizations that org admin and rp admin won't be able to access, but that superuser and hub admin
        # should be able to access
        OrganizationFactory.create_batch(size=2)
        api_client.force_authenticate(user)
        # superuser can retrieve all
        if user.is_superuser:
            query = Organization.objects.all()
            assert query.count()
            for id_ in query.values_list("id", flat=True):
                response = api_client.get(reverse("organization-detail", args=(id_,)))
                assert response.status_code == status.HTTP_200_OK
        else:
            query = Organization.objects.filtered_by_role_assignment(user.roleassignment)
            spy = mocker.spy(OrganizationQuerySet, "filtered_by_role_assignment")
            unpermitted = Organization.objects.exclude(id__in=query.values_list("id", flat=True))
            assert query.count()
            if user.roleassignment.role_type == Roles.HUB_ADMIN:
                assert unpermitted.count() == 0
            else:
                assert unpermitted.count() >= 1
            for id_ in query.values_list("id", flat=True):
                response = api_client.get(reverse("organization-detail", args=(id_,)))
                assert response.status_code == status.HTTP_200_OK
            for id_ in unpermitted.values_list("id", flat=True):
                response = api_client.get(reverse("organization-detail", args=(id_,)))
                assert response.status_code == status.HTTP_404_NOT_FOUND
            # this test is valid insofar as the spyed on method `filtered_by_role_assignment` is called, and has been
            # tested elsewhere and proven to be valid. Here, we just need to show that it gets called for each time we tried to retrieve
            # an Organization.
            assert spy.call_count == Organization.objects.count()

    @pytest.fixture(
        params=[
            ("user_no_role_assignment", status.HTTP_403_FORBIDDEN),
            ("contributor_user", status.HTTP_403_FORBIDDEN),
            ("rp_user", status.HTTP_404_NOT_FOUND),
            (None, status.HTTP_401_UNAUTHORIZED),
        ]
    )
    def retrieve_case(self, request):
        return request.getfixturevalue(request.param[0]) if request.param[0] else None, request.param[1]

    def test_retrieve_when_unmpermitted_user(self, retrieve_case, api_client, organization):
        """Show that unmpermitted users cannot retrieve an organization."""
        user, expected_response = retrieve_case
        api_client.force_authenticate(user)
        response = api_client.get(reverse("organization-detail", args=(organization.id,)))
        assert response.status_code == expected_response

    def test_list_when_expected_user(self, user, api_client, mocker):
        """Show that expected users can list only permitted organizations.

        NB: This test treats Organization.objects.filtered_by_role_assignment as a blackbox. That function is well-tested
        elsewhere.
        """
        # ensure there will be organizations that org admin and rp admin won't be able to access, but that superuser and hub admin
        # should be able to access
        OrganizationFactory.create_batch(size=2)
        api_client.force_authenticate(user)

        # superuser can retrieve all
        if user.is_superuser:
            query = Organization.objects.all()
            assert query.count()
            response = api_client.get(reverse("organization-list"))
            assert response.status_code == status.HTTP_200_OK
            orgs = response.json()
            assert len(orgs) == query.count()
            assert {x["id"] for x in orgs} == set(query.values_list("id", flat=True))

        else:
            query = Organization.objects.filtered_by_role_assignment(user.roleassignment)
            spy = mocker.spy(OrganizationQuerySet, "filtered_by_role_assignment")
            unpermitted = Organization.objects.exclude(id__in=query.values_list("id", flat=True))
            assert query.count()
            if user.roleassignment.role_type == Roles.HUB_ADMIN:
                assert unpermitted.count() == 0
            else:
                assert unpermitted.count() >= 1
            response = api_client.get(reverse("organization-list"))
            orgs = response.json()
            assert len(orgs) == query.count()
            assert {x["id"] for x in orgs} == set(query.values_list("id", flat=True))

            # this test is valid insofar as the spyed on method `filtered_by_role_assignment` is called, and has been
            # tested elsewhere and proven to be valid. Here, we just need to show that it gets called.
            assert spy.call_count == 1

    @pytest.fixture(params=["user_no_role_assignment", "contributor_user", None])
    def list_user(self, request):
        return request.getfixturevalue(request.param) if request.param else None

    def test_list_when_unexpected_user(self, list_user, api_client):
        """Show that unexpected users can't list organizations."""
        api_client.force_authenticate(list_user)
        response = api_client.get(reverse("organization-list"))
        assert response.status_code == (status.HTTP_403_FORBIDDEN if list_user else status.HTTP_401_UNAUTHORIZED)

    @pytest.fixture(
        params=[
            "org_user_free_plan",
            "superuser",
        ]
    )
    def patch_user(self, request):
        return request.getfixturevalue(request.param)

    @pytest.fixture(
        params=[
            ("org_valid_patch_data", status.HTTP_200_OK, None, False),
            (
                "org_invalid_patch_data_name_too_long",
                status.HTTP_400_BAD_REQUEST,
                {"name": ["Ensure this field has no more than 63 characters."]},
                False,
            ),
            ("invalid_patch_data_unexpected_fields", status.HTTP_200_OK, {}, True),
        ]
    )
    def patch_test_case(self, request):
        return request.getfixturevalue(request.param[0]), request.param[1], request.param[2], request.param[3]

    def test_patch_duplicate_org_name_error_message(self, superuser, api_client, organization):
        existing_org = OrganizationFactory()
        api_client.force_authenticate(superuser)
        response = api_client.patch(
            reverse("organization-detail", args=(organization.id,)), data={"name": existing_org.name}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"name": ["Organization with this name already exists."]}

    def test_patch_when_expected_user(self, patch_user, patch_test_case, organization, mocker, api_client):
        """Show that expected users can patch what they should be able to, and cannot what they shouldn't.

        Specifically, superusers should be able to patch any org (but only permitted fields), while org users should only be able
        to patch permitted fields on an org they own, and not unowned orgs
        """
        data, expect_status_code, error_response, has_fake_fields = patch_test_case
        api_client.force_authenticate(patch_user)
        if patch_user.is_superuser:
            response = api_client.patch(reverse("organization-detail", args=(organization.id,)), data=data)
            assert response.status_code == expect_status_code
            if error_response:
                assert response.json() == error_response
            elif not has_fake_fields:
                organization.refresh_from_db()
                for key in data:
                    assert response.json()[key] == getattr(organization, key)
        else:
            spy = mocker.spy(OrganizationQuerySet, "filtered_by_role_assignment")
            assert organization.id != patch_user.roleassignment.organization
            unpermitted_response = api_client.patch(reverse("organization-detail", args=(organization.id,)), data=data)
            assert unpermitted_response.status_code == status.HTTP_404_NOT_FOUND
            last_modified = patch_user.roleassignment.organization.modified
            permitted_response = api_client.patch(
                reverse("organization-detail", args=((permitted_org := patch_user.roleassignment.organization).id,)),
                data=data,
            )
            assert permitted_response.status_code == expect_status_code
            permitted_org.refresh_from_db()
            if error_response:
                assert permitted_response.json() == error_response
                assert permitted_org.modified == last_modified
            elif not has_fake_fields:
                for key in data:
                    assert permitted_response.json()[key] == getattr(permitted_org, key)
            # once for each of the calls to the patch endpoint
            assert spy.call_count == 2

    @pytest.fixture(
        params=[
            "hub_admin_user",
            "user_no_role_assignment",
            "contributor_user",
            "rp_user",
            None,
        ]
    )
    def unsupported_patch_user(self, request):
        return request.getfixturevalue(request.param) if request.param else None

    def test_patch_when_unexpected_user(self, unsupported_patch_user, api_client, organization):
        """Show that unexpected users cannot patch an Org."""
        api_client.force_authenticate(unsupported_patch_user)
        response = api_client.patch(reverse("organization-detail", args=(organization.id,)), data={})
        assert response.status_code == (
            status.HTTP_403_FORBIDDEN if unsupported_patch_user else status.HTTP_401_UNAUTHORIZED
        )

    def test_patch_different_org(self, org_user_free_plan, api_client, organization):
        """Show that only org admins can access this patch endpoint."""
        api_client.force_authenticate(org_user_free_plan)
        response = api_client.patch(reverse("organization-detail", args=(organization.id,)), data={})
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_construct_stripe_event_happy_path(self, mocker, settings):
        settings.STRIPE_WEBHOOK_SECRET_UPGRADES = "some-secret"
        mock_construct = mocker.patch("stripe.Webhook.construct_event", return_value=(mock_event := mocker.Mock()))
        mock_request = mocker.Mock(META={"HTTP_STRIPE_SIGNATURE": "some-signature"})
        payload = mocker.Mock()
        assert OrganizationViewSet.construct_stripe_event(mock_request, payload) == mock_event
        mock_construct.assert_called_once_with(payload, mocker.ANY, secret=settings.STRIPE_WEBHOOK_SECRET_UPGRADES)

    def test_construct_stripe_event_bad_signature(self, mocker):
        logger_spy = mocker.spy(logger, "exception")
        mock_request = mocker.Mock(META={"HTTP_STRIPE_SIGNATURE": "some-signature"})
        mocker.patch(
            "stripe.Webhook.construct_event", side_effect=SignatureVerificationError("Uh oh", sig_header="something")
        )
        with pytest.raises(APIException):
            OrganizationViewSet.construct_stripe_event(mock_request, mocker.Mock())
        logger_spy.assert_called_once_with(
            "Invalid signature on Stripe webhook request. Is STRIPE_WEBHOOK_SECRET_CONTRIBUTIONS set correctly?"
        )

    def test_is_upgrade_from_free_to_core(self, mocker, organization, stripe_checkout_process_completed, settings):
        mocker.patch("stripe.Subscription.retrieve", return_value=(mock_sub := mocker.MagicMock()))
        mock_sub["items"].data = [mock_item := mocker.Mock()]
        settings.STRIPE_CORE_PRODUCT_ID = "some-product-id"
        mock_item.price.product = settings.STRIPE_CORE_PRODUCT_ID
        assert stripe_checkout_process_completed["data"]["object"]["client_reference_id"] == str(organization.uuid)
        assert stripe_checkout_process_completed["type"] == "checkout.session.completed"
        assert organization.plan_name == FreePlan.name
        assert OrganizationViewSet.is_upgrade_from_free_to_core(stripe_checkout_process_completed, organization) is True

    def test_is_upgrade_from_free_to_core_when_event_data_not_have_subscription(
        self, stripe_checkout_process_completed, mocker, organization
    ):
        logger_spy = mocker.spy(logger, "warning")
        stripe_checkout_process_completed["data"]["object"]["subscription"] = None
        assert not OrganizationViewSet.is_upgrade_from_free_to_core(stripe_checkout_process_completed, organization)
        logger_spy.assert_called_once_with(
            "No subscription ID found in event %s", stripe_checkout_process_completed["id"]
        )

    def test_send_upgrade_success_confirmation_email_sends_to_all_relevant_org_admins(
        self, mocker, organization, settings
    ):
        mocker.patch(
            "apps.organizations.views.OrganizationViewSet.generate_integrations_management_url",
            return_value=(mailchimp_url := fake.url()),
        )
        settings.UPGRADE_DAYS_WAIT = 3
        RoleAssignmentFactory.create_batch(
            organization=organization, role_type=Roles.ORG_ADMIN, user__email=fake.email, size=(size := 2)
        )
        organization.refresh_from_db()
        assert organization.roleassignment_set.filter(role_type="org_admin").count() == size
        mock_send_email = mocker.patch("apps.emails.tasks.send_templated_email.delay")
        OrganizationViewSet.send_upgrade_success_confirmation_email(organization)
        org_admin_emails = (
            organization.roleassignment_set.filter(role_type="org_admin")
            .values_list("user__email", flat=True)
            .distinct("user__email")
        )
        assert mock_send_email.call_count == len(org_admin_emails)
        for n, x in enumerate(org_admin_emails):
            expected_context = {
                "logo_url": f"{settings.SITE_URL}/static/nre_logo_black_yellow.png",
                "plus_icon": f"{settings.SITE_URL}/static/plus-icon.png",
                "mail_icon": f"{settings.SITE_URL}/static/mail-icon.png",
                "paint_icon": f"{settings.SITE_URL}/static/paint-icon.png",
                "check_icon": f"{settings.SITE_URL}/static/check-icon.png",
                "mailchimp_integration_url": mailchimp_url,
                "upgrade_days_wait": settings.UPGRADE_DAYS_WAIT,
            }
            assert mock_send_email.call_args_list[n] == mocker.call(
                to=x,
                subject=FREE_TO_CORE_UPGRADE_EMAIL_SUBJECT,
                message_as_text=render_to_string("upgrade-confirmation.txt", context=expected_context),
                message_as_html=render_to_string("upgrade-confirmation.html", context=expected_context),
            )

    def test_generate_integrations_management_url(self, organization, settings):
        assert (
            OrganizationViewSet.generate_integrations_management_url(organization)
            == f"{settings.SITE_URL}/settings/integrations/"
        )

    def test_upgrade_from_free_to_core(self, organization, stripe_checkout_process_completed, mocker):
        organization.stripe_subscription_id = stripe_checkout_process_completed["data"]["object"]["subscription"]
        save_spy = mocker.spy(Organization, "save")
        assert organization.plan_name == FreePlan.name
        mock_set_revision_comment = mocker.patch("reversion.set_comment")
        OrganizationViewSet.upgrade_from_free_to_core(organization, stripe_checkout_process_completed)
        assert (
            organization.stripe_subscription_id == stripe_checkout_process_completed["data"]["object"]["subscription"]
        )
        organization.refresh_from_db()
        assert organization.plan_name == CorePlan.name
        save_spy.assert_called_once_with(
            organization, update_fields={"stripe_subscription_id", "plan_name", "modified"}
        )
        mock_set_revision_comment.assert_called_once_with("`upgrade_from_free_to_core` upgraded this org")

    def test_handle_checkout_session_completed_event(
        self, api_client, stripe_checkout_process_completed, mocker, settings
    ):
        """Show that the handle_stripe_webhook endpoint works as expected."""
        settings.STRIPE_CORE_PRODUCT_ID = "some-product-id"
        mocker.patch("stripe.webhook.WebhookSignature.verify_header", return_value=True)
        mock_sub = mocker.MagicMock()
        mock_item = mocker.Mock()
        mock_item.price.product = settings.STRIPE_CORE_PRODUCT_ID
        mock_sub["items"].data = [mock_item]
        mocker.patch("stripe.Subscription.retrieve", return_value=mock_sub)
        mock_is_upgrade_from_free_to_core = mocker.patch(
            "apps.organizations.views.OrganizationViewSet.is_upgrade_from_free_to_core", return_value=True
        )
        upgrade_from_free_to_core_spy = mocker.spy(OrganizationViewSet, "upgrade_from_free_to_core")
        headers = {"HTTP_STRIPE_SIGNATURE": "some-signature"}
        org = Organization.objects.get(uuid=stripe_checkout_process_completed["data"]["object"]["client_reference_id"])
        assert org.stripe_subscription_id is None
        assert org.plan_name == FreePlan.name
        assert (
            api_client.post(
                reverse("organization-handle-stripe-webhook"),
                stripe_checkout_process_completed,
                format="json",
                **headers,
            ).status_code
            == status.HTTP_200_OK
        )
        mock_is_upgrade_from_free_to_core.assert_called_once_with(stripe_checkout_process_completed, org)
        upgrade_from_free_to_core_spy.assert_called_once_with(org, stripe_checkout_process_completed)

    def test_handle_checkout_session_completed_event_when_org_not_found(
        self, mocker, stripe_checkout_process_completed, api_client
    ):
        save_spy = mocker.spy(Organization, "save")
        logger_spy = mocker.spy(logger, "warning")
        mocker.patch("stripe.webhook.WebhookSignature.verify_header", return_value=True)
        headers = {"HTTP_STRIPE_SIGNATURE": "some-signature"}
        Organization.objects.filter(
            uuid=(uid := stripe_checkout_process_completed["data"]["object"]["client_reference_id"])
        ).delete()
        assert (
            api_client.post(
                reverse("organization-handle-stripe-webhook"),
                stripe_checkout_process_completed,
                format="json",
                **headers,
            ).status_code
            == status.HTTP_200_OK
        )
        logger_spy.assert_called_once_with("No organization found with uuid %s", uid)
        save_spy.assert_not_called()

    def test_handle_checkout_session_completed_event_when_org_already_has_stripe_subscription_id(
        self, stripe_checkout_process_completed, organization, api_client, mocker
    ):
        organization.stripe_subscription_id = "something"
        organization.save()
        save_spy = mocker.spy(Organization, "save")
        logger_spy = mocker.spy(logger, "info")
        mocker.patch("stripe.webhook.WebhookSignature.verify_header", return_value=True)
        headers = {"HTTP_STRIPE_SIGNATURE": "some-signature"}
        assert (
            api_client.post(
                reverse("organization-handle-stripe-webhook"),
                stripe_checkout_process_completed,
                format="json",
                **headers,
            ).status_code
            == status.HTTP_200_OK
        )
        save_spy.assert_not_called()
        assert logger_spy.call_args == mocker.call(
            "Organization with uuid %s already has a stripe subscription id. No further action to be taken",
            str(organization.uuid),
        )

    def test_handle_checkout_session_completed_event_when_not_upgrade_from_free_to_core(
        self, mocker, api_client, organization, stripe_checkout_process_completed
    ):
        mocker.patch("apps.organizations.views.OrganizationViewSet.is_upgrade_from_free_to_core", return_value=False)
        save_spy = mocker.spy(Organization, "save")
        logger_spy = mocker.spy(logger, "info")
        mocker.patch("stripe.webhook.WebhookSignature.verify_header", return_value=True)
        headers = {"HTTP_STRIPE_SIGNATURE": "some-signature"}
        assert (
            api_client.post(
                reverse("organization-handle-stripe-webhook"),
                stripe_checkout_process_completed,
                format="json",
                **headers,
            ).status_code
            == status.HTTP_200_OK
        )
        save_spy.assert_not_called()
        assert logger_spy.call_args == mocker.call(
            "Organization with uuid %s is not upgrading from free to core. No further action to be taken",
            str(organization.uuid),
        )

    @pytest.mark.parametrize(
        ("event_type", "handler"),
        [
            ("checkout.session.completed", "handle_checkout_session_completed_event"),
            ("customer.subscription.deleted", "handle_customer_subscription_deleted_event"),
        ],
    )
    def test_handle_stripe_webhook_when_handled_event_type(self, event_type, handler, mocker, api_client):
        mock_handler = mocker.patch(f"apps.organizations.views.OrganizationViewSet.{handler}")
        mocker.patch(
            "apps.organizations.views.OrganizationViewSet.construct_stripe_event",
            return_value=(event := {"type": event_type}),
        )
        assert (
            api_client.post(
                reverse("organization-handle-stripe-webhook"),
                json.dumps(event),
                content_type="application/json",
            ).status_code
            == status.HTTP_200_OK
        )
        mock_handler.assert_called_once_with(event)

    def test_handle_stripe_webhook_when_unhandled_event_type(self, mocker, api_client):
        mocker.patch(
            "apps.organizations.views.OrganizationViewSet.construct_stripe_event",
            return_value=(event := {"type": (event_type := "some-other-event")}),
        )
        logger_spy = mocker.spy(logger, "debug")
        assert (
            api_client.post(
                reverse("organization-handle-stripe-webhook"),
                json.dumps(event),
                content_type="application/json",
            ).status_code
            == status.HTTP_200_OK
        )
        logger_spy.assert_called_once_with("No handler for event type %s", event_type)

    def test_handle_customer_subscription_deleted_event_happy_path(self, mocker, organization):
        mock_downgrade_org = mocker.patch("apps.organizations.models.Organization.downgrade_to_free_plan")
        event = stripe.Event.construct_from(
            {"id": "evt_XXX", "data": {"object": {"id": (sub_id := "sub_XXX")}}}, key="test"
        )
        organization.stripe_subscription_id = sub_id
        organization.save()
        OrganizationViewSet.handle_customer_subscription_deleted_event(event)
        mock_downgrade_org.assert_called_once()

    def test_handle_customer_subscription_deleted_event_when_no_org_found_with_sub_id(self, mocker, organization):
        logger_spy = mocker.spy(logger, "warning")
        mock_downgrade_org = mocker.patch("apps.organizations.models.Organization.downgrade_to_free_plan")
        event = stripe.Event.construct_from(
            {"id": "evt_XXX", "data": {"object": {"id": (sub_id := "sub_XXX")}}}, key="test"
        )
        assert organization.stripe_subscription_id != sub_id
        OrganizationViewSet.handle_customer_subscription_deleted_event(event)
        mock_downgrade_org.assert_not_called()
        logger_spy.assert_called_once_with("No organization found with stripe subscription id %s", sub_id)


@pytest.fixture
def tax_id_valid():
    return fake.pystr(min_chars=TAX_ID_MIN_LENGTH, max_chars=TAX_ID_MAX_LENGTH)


@pytest.fixture
def tax_id_invalid_too_short():
    return fake.pystr(max_chars=TAX_ID_MIN_LENGTH - 1)


@pytest.fixture
def tax_id_invalid_too_long():
    return fake.pystr(min_chars=TAX_ID_MAX_LENGTH + 1)


@pytest.fixture
def rp_valid_patch_data(tax_id_valid):
    return {"tax_id": tax_id_valid}


@pytest.fixture
def rp_invalid_patch_data_tax_id_too_short(tax_id_invalid_too_short):
    return {"tax_id": tax_id_invalid_too_short}


@pytest.fixture
def rp_invalid_patch_data_tax_id_too_long(tax_id_invalid_too_long):
    return {"tax_id": tax_id_invalid_too_long}


@pytest.fixture
def rp_invalid_patch_data_contact_phone():
    return {"contact_phone": "abc"}


@pytest.fixture
def rp_valid_patch_data_contact_phone():
    return {"contact_phone": "+14155552671"}


@pytest.fixture
def rp_invalid_patch_data_contact_email():
    return {"contact_email": "abc"}


@pytest.fixture
def rp_valid_patch_data_contact_email():
    return {"contact_email": "valid@email.com"}


@pytest.fixture
def invalid_patch_data_unexpected_fields():
    return {"foo": "bar"}


@pytest.fixture
def secret_value() -> str:
    return "my-top-secret-value"


@pytest.fixture
def _mock_secret_manager(mocker, secret_value):

    class SecretManager:
        def __init__(self, secret_value):
            self.secret = secret_value

        def get(self, *args, **kwargs):
            return self.secret

        def set(self, obj, value):
            self.secret = value

    manager = SecretManager(secret_value)

    mocker.patch.object(GoogleCloudSecretProvider, "__get__", side_effect=manager.get)
    mocker.patch.object(GoogleCloudSecretProvider, "__set__", side_effect=manager.set)
    mocker.patch.object(GoogleCloudSecretProvider, "__delete__")


@pytest.mark.django_db
@pytest.mark.usefixtures("default_feature_flags")
class TestRevenueProgramViewSet:
    def test_pagination_disabled(self):
        assert RevenueProgramViewSet.pagination_class is None

    @pytest.fixture(params=["org_user_free_plan", "rp_user", "superuser"])
    def user(self, request):
        return request.getfixturevalue(request.param)

    def test_retrieve_rp_when_expected_user(self, user, api_client, mocker):
        """Show that typical users can retrieve what they should be able to, and can't retrieve what they shouldn't.

        NB: This test treats RevenueProgram.objects.filtered_by_role_assignment as a blackbox. That function is well-tested
        elsewhere.
        """
        # ensure there will be RPs that org admin and rp admin won't be able to access, but that superuser should be able to
        # access
        new_org = OrganizationFactory()
        RevenueProgramFactory.create_batch(size=2, organization=new_org)
        api_client.force_authenticate(user)

        # superuser can retrieve all
        if user.is_superuser:
            query = RevenueProgram.objects.all()
            assert query.count()
            for rp_id in query.values_list("id", flat=True):
                response = api_client.get(reverse("revenue-program-detail", args=(rp_id,)))
                assert response.status_code == status.HTTP_200_OK
        else:
            query = RevenueProgram.objects.filtered_by_role_assignment(user.roleassignment)
            spy = mocker.spy(RevenueProgramQuerySet, "filtered_by_role_assignment")
            unpermitted = RevenueProgram.objects.exclude(id__in=query.values_list("id", flat=True))
            assert query.count()
            assert unpermitted.count()
            for rp_id in query.values_list("id", flat=True):
                response = api_client.get(reverse("revenue-program-detail", args=(rp_id,)))
                assert response.status_code == status.HTTP_200_OK
            for rp_id in unpermitted.values_list("id", flat=True):
                response = api_client.get(reverse("revenue-program-detail", args=(rp_id,)))
                assert response.status_code == status.HTTP_404_NOT_FOUND
            # this test is valid insofar as the spyed on method `filtered_by_role_assignment` is called, and has been
            # tested elsewhere and proven to be valid. Here, we just need to show that it gets called for each time we tried to retrieve
            # an RP.
            assert spy.call_count == RevenueProgram.objects.count()

    @pytest.fixture(
        params=[
            "hub_admin_user",
            "user_no_role_assignment",
            "contributor_user",
            None,
        ]
    )
    def unsupported_user(self, request):
        return request.getfixturevalue(request.param) if request.param else None

    def test_retrieve_rp_when_unexpected_user(self, unsupported_user, api_client, revenue_program):
        """Show that typical users can retrieve what they should be able to, and can't retrieve what they shouldn't.

        NB: This test treats RevenueProgram.objects.filtered_by_role_assignment as a blackbox. That function is well-tested
        elsewhere.
        """
        api_client.force_authenticate(unsupported_user)
        response = api_client.get(reverse("revenue-program-detail", args=(revenue_program.id,)))
        assert response.status_code == (status.HTTP_403_FORBIDDEN if unsupported_user else status.HTTP_401_UNAUTHORIZED)

    def test_list_when_expected_user(self, user, api_client, mocker):
        """Show that typical users can retrieve what they should be able to, and can't retrieve what they shouldn't.

        NB: This test treats RevenueProgram.objects.filtered_by_role_assignment as a blackbox. That function is well-tested
        elsewhere.
        """
        # ensure there will be RPs that org admin and rp admin won't be able to access, but that superuser should be able to
        # access
        new_org = OrganizationFactory()
        RevenueProgramFactory.create_batch(size=2, organization=new_org)

        api_client.force_authenticate(user)

        # superuser can retrieve all
        if user.is_superuser:
            query = RevenueProgram.objects.all()
            assert query.count()
            response = api_client.get(reverse("revenue-program-list"))
            assert response.status_code == status.HTTP_200_OK
            rps = response.json()
            assert len(rps) == query.count()
            assert {x["id"] for x in rps} == set(query.values_list("id", flat=True))

        else:
            query = RevenueProgram.objects.filtered_by_role_assignment(user.roleassignment)
            spy = mocker.spy(RevenueProgramQuerySet, "filtered_by_role_assignment")
            unpermitted = RevenueProgram.objects.exclude(id__in=query.values_list("id", flat=True))
            assert query.count()
            assert unpermitted.count()
            response = api_client.get(reverse("revenue-program-list"))
            rps = response.json()
            assert len(rps) == query.count()
            assert {x["id"] for x in rps} == set(query.values_list("id", flat=True))
            # this test is valid insofar as the spyed on method `filtered_by_role_assignment` is called, and has been
            # tested elsewhere and proven to be valid. Here, we just need to show that it gets called.
            assert spy.call_count == 1

    def test_list_when_unexpected_user(self, unsupported_user, api_client):
        """Show that unexpected users cannot retrieve any revenue programs."""
        RevenueProgramFactory.create_batch(size=2)
        api_client.force_authenticate(unsupported_user)
        response = api_client.get(reverse("revenue-program-list"))
        assert response.status_code == (status.HTTP_403_FORBIDDEN if unsupported_user else status.HTTP_401_UNAUTHORIZED)

    @pytest.fixture(
        params=[
            ("rp_valid_patch_data", status.HTTP_200_OK, None, False),
            (
                "rp_invalid_patch_data_tax_id_too_short",
                status.HTTP_400_BAD_REQUEST,
                {"tax_id": ["Ensure this field has at least 9 characters."]},
                False,
            ),
            (
                "rp_invalid_patch_data_tax_id_too_long",
                status.HTTP_400_BAD_REQUEST,
                {"tax_id": ["Ensure this field has no more than 9 characters."]},
                False,
            ),
            (
                "invalid_patch_data_unexpected_fields",
                status.HTTP_200_OK,
                {},
                True,
            ),
            (
                "rp_invalid_patch_data_contact_phone",
                status.HTTP_400_BAD_REQUEST,
                {"contact_phone": ["Unknown phone format: abc"]},
                False,
            ),
            (
                "rp_valid_patch_data_contact_phone",
                status.HTTP_200_OK,
                {},
                True,
            ),
            (
                "rp_invalid_patch_data_contact_email",
                status.HTTP_400_BAD_REQUEST,
                {"contact_email": ["Enter a valid email address."]},
                False,
            ),
            (
                "rp_valid_patch_data_contact_email",
                status.HTTP_200_OK,
                {},
                True,
            ),
        ]
    )
    def patch_test_case(self, request):
        return request.getfixturevalue(request.param[0]), request.param[1], request.param[2], request.param[3]

    @pytest.fixture(params=["org_user_free_plan", "superuser"])
    def patch_user(self, request, revenue_program):
        user = request.getfixturevalue(request.param)
        if not user.is_superuser:
            ra = user.get_role_assignment()
            ra.organization = revenue_program.organization
            ra.save()
        return user

    def test_patch_when_have_access(self, patch_user, api_client, revenue_program, patch_test_case):
        """Show that superusers can patch RPs with valid data and cannot with invalid data."""
        data, expect_status_code, error_response, has_fake_fields = patch_test_case
        api_client.force_authenticate(patch_user)
        response = api_client.patch(reverse("revenue-program-detail", args=(revenue_program.id,)), data=data)
        assert response.status_code == expect_status_code
        if error_response:
            assert response.json() == error_response
        elif not has_fake_fields:
            revenue_program.refresh_from_db()
            for key in data:
                assert response.json()[key] == getattr(revenue_program, key)

    def test_patch_when_not_have_access(self, org_user_free_plan, api_client):
        """Show that org admins cannot patch another org's rp."""
        unowned = RevenueProgramFactory()
        assert unowned.organization != org_user_free_plan.get_role_assignment().organization
        api_client.force_authenticate(org_user_free_plan)
        response = api_client.patch(reverse("revenue-program-detail", args=(unowned.id,)), data={})
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_patch_show_rp_user_not_allowed(self, rp_user, api_client, revenue_program):
        """Show that rp admins cannot patch their own rp."""
        ra = rp_user.get_role_assignment()
        ra.revenue_programs.add(revenue_program)
        ra.save()
        api_client.force_authenticate(rp_user)
        response = api_client.patch(reverse("revenue-program-detail", args=(revenue_program.id,)), data={})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_patch_when_unexpected_user(self, unsupported_user, api_client, revenue_program):
        """Show that unexpected users cannot patch an RP."""
        api_client.force_authenticate(unsupported_user)
        response = api_client.patch(reverse("revenue-program-detail", args=(revenue_program.id,)), data={})
        assert response.status_code == (status.HTTP_403_FORBIDDEN if unsupported_user else status.HTTP_401_UNAUTHORIZED)

    def test_patch_different_org(self, org_user_free_plan, api_client, revenue_program):
        """Show that org admins cannot patch another org's rp."""
        api_client.force_authenticate(org_user_free_plan)
        response = api_client.patch(reverse("revenue-program-detail", args=(revenue_program.id,)), data={})
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_mailchimp_detail_configured_correctly(self):
        """Prove the mailchimp detail endpoint is configured properly.

        We use this approach so that we don't end up testing DRF itself. Knowing that this view
        is configured in the way expected here should be a guarantee that this endpoint
        results in desired permissions and serializer class being set.
        """
        assert RevenueProgramViewSet.mailchimp.detail is True
        assert RevenueProgramViewSet.mailchimp.url_name == "mailchimp"
        assert set(RevenueProgramViewSet.mailchimp.kwargs.get("permission_classes", [])) == {
            IsAuthenticated,
            IsActiveSuperUser,
        }
        assert (
            RevenueProgramViewSet.mailchimp.kwargs.get("serializer_class", None)
            == MailchimpRevenueProgramForSwitchboard
        )

    def test_mailchimp_configure_detail_configured_correctly(self):
        assert RevenueProgramViewSet.mailchimp_configure.detail is True
        assert RevenueProgramViewSet.mailchimp_configure.url_name == "mailchimp-configure"
        assert (
            RevenueProgramViewSet.mailchimp_configure.kwargs.get("serializer_class", None)
            == MailchimpRevenueProgramForSpaConfiguration
        )
        permission_classes = RevenueProgramViewSet.mailchimp_configure.kwargs.get("permission_classes")
        assert permission_classes[0] == IsAuthenticated
        assert permission_classes[1].operator_class == OR
        assert permission_classes[1].op1_class == IsActiveSuperUser
        assert permission_classes[1].op2_class.operator_class == AND
        assert permission_classes[1].op2_class.op1_class == HasRoleAssignment
        assert permission_classes[1].op2_class.op2_class.operator_class == OR
        assert permission_classes[1].op2_class.op2_class.op1_class == IsOrgAdmin
        assert permission_classes[1].op2_class.op2_class.op2_class == IsHubAdmin

    def test_mailchimp_configure_get_happy_path(
        self, mc_connected_rp, hub_admin_user, api_client, mocker, mailchimp_email_list
    ):
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_email_list", mailchimp_email_list)
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_email_lists", [mailchimp_email_list])
        mc_connected_rp.mailchimp_list_id = mailchimp_email_list.id
        mc_connected_rp.save()
        api_client.force_authenticate(hub_admin_user)
        response = api_client.get(reverse("revenue-program-mailchimp-configure", args=(mc_connected_rp.id,)))
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == MailchimpRevenueProgramForSpaConfiguration(mc_connected_rp).data

    def test_mailchimp_configure_patch_mailchimp_list_id_happy_path(
        self, mc_connected_rp, hub_admin_user, api_client, mocker, mailchimp_email_list
    ):
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_email_list", mailchimp_email_list)
        mocker.patch("apps.organizations.models.RevenueProgram.mailchimp_email_lists", [mailchimp_email_list])
        mc_connected_rp.mailchimp_list_id = None
        mc_connected_rp.save()

        api_client.force_authenticate(hub_admin_user)
        response = api_client.patch(
            reverse("revenue-program-mailchimp-configure", args=(mc_connected_rp.id,)),
            data={"mailchimp_list_id": mailchimp_email_list.id},
        )
        assert response.status_code == status.HTTP_200_OK
        mc_connected_rp.refresh_from_db()
        assert response.json() == MailchimpRevenueProgramForSpaConfiguration(mc_connected_rp).data
        assert mc_connected_rp.mailchimp_list_id == mailchimp_email_list.id

    @pytest.fixture
    def org_admin_who_owns_rp(self, org_user_free_plan, revenue_program):
        revenue_program.organization = org_user_free_plan.get_role_assignment().organization
        revenue_program.save()
        org_user_free_plan.roleassignment.revenue_programs.add(revenue_program)
        org_user_free_plan.roleassignment.save()
        return org_user_free_plan

    @pytest.fixture
    def org_admin_who_does_not_own_rp(self, org_user_free_plan, revenue_program):
        assert revenue_program not in org_user_free_plan.roleassignment.revenue_programs.all()
        return org_user_free_plan

    @pytest.mark.parametrize(
        ("user_fixture", "permitted"),
        [
            ("org_admin_who_owns_rp", True),
            ("org_admin_who_does_not_own_rp", False),
            ("hub_admin_user", True),
            ("superuser", True),
        ],
    )
    def test_activecampaign_configure_when_get(self, revenue_program, user_fixture, permitted, api_client, request):
        user = request.getfixturevalue(user_fixture)
        api_client.force_authenticate(user)
        response = api_client.get(reverse("revenue-program-activecampaign-configure", args=(revenue_program.pk,)))
        assert response.status_code == (status.HTTP_200_OK if permitted else status.HTTP_404_NOT_FOUND)
        if permitted:
            assert response.json() == {
                "id": revenue_program.id,
                "name": revenue_program.name,
                "slug": revenue_program.slug,
                "stripe_account_id": revenue_program.stripe_account_id,
                "activecampaign_integration_connected": revenue_program.activecampaign_integration_connected,
            }

    @pytest.mark.parametrize(
        ("user_fixture", "permitted"),
        [
            ("org_admin_who_owns_rp", True),
            ("org_admin_who_does_not_own_rp", False),
            ("hub_admin_user", True),
            ("superuser", True),
        ],
    )
    @pytest.mark.usefixtures("_mock_secret_manager")
    def test_activecampaign_configure_when_patch(
        self,
        revenue_program,
        user_fixture,
        permitted,
        api_client,
        mocker,
        request,
    ):
        mocker.patch(
            "apps.organizations.serializers.ActiveCampaignRevenueProgramForSpaSerializer.confirm_activecampaign_url_and_token",
            return_value=True,
        )
        user = request.getfixturevalue(user_fixture)
        api_client.force_authenticate(user)
        assert (old_url := revenue_program.activecampaign_server_url) != (new_url := "https://new.url")
        data = {"activecampaign_server_url": new_url, "activecampaign_access_token": (token := "something-truthy")}
        response = api_client.patch(
            reverse("revenue-program-activecampaign-configure", args=(revenue_program.pk,)),
            data=data,
        )
        assert response.status_code == (status.HTTP_200_OK if permitted else status.HTTP_404_NOT_FOUND)
        revenue_program.refresh_from_db()
        if permitted:
            assert revenue_program.activecampaign_server_url == new_url
            assert revenue_program.activecampaign_access_token == token
        else:
            assert revenue_program.activecampaign_server_url == old_url

    def test_activecampaign_configure_when_patch_and_ac_url_and_token_invalid(
        self, org_admin_who_owns_rp, revenue_program, api_client, mocker
    ):
        mocker.patch(
            "apps.organizations.serializers.ActiveCampaignRevenueProgramForSpaSerializer.confirm_activecampaign_url_and_token",
            return_value=False,
        )
        api_client.force_authenticate(org_admin_who_owns_rp)
        response = api_client.patch(
            reverse("revenue-program-activecampaign-configure", args=(revenue_program.pk,)),
            data={"activecampaign_server_url": "https://new.url", "activecampaign_access_token": "something-truthy"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"non_field_errors": ["Invalid ActiveCampaign URL or token"]}

    def test_mailchimp(self, api_client, superuser, revenue_program):
        api_client.force_authenticate(superuser)
        response = api_client.get(reverse("revenue-program-mailchimp", args=(revenue_program.id,)))
        assert response.status_code == status.HTTP_200_OK


class FakeStripeProduct:
    def __init__(self, id_):
        self.id = id_


@pytest.mark.django_db
class TestHandleStripeAccountLink:
    def test_happy_path_when_stripe_already_verified_on_payment_provider(self, org_user_free_plan, api_client):
        rp = (ra := org_user_free_plan.roleassignment).revenue_programs.first()
        rp.payment_provider.stripe_verified = True
        rp.payment_provider.stripe_product_id = "something"
        rp.payment_provider.save()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        api_client.force_authenticate(user=ra.user)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"requiresVerification": False}

    def test_happy_path_when_stripe_account_not_yet_created(self, monkeypatch, org_user_free_plan, api_client, mocker):
        stripe_account_id = "fakeId"
        mock_stripe_account_create = mocker.MagicMock(
            return_value={
                "details_submitted": False,
                "charges_enabled": False,
                "id": stripe_account_id,
                "requirements": {"disabled_reason": "foo.past_due"},
            }
        )
        monkeypatch.setattr("stripe.Account.create", mock_stripe_account_create)
        product_id = "some_id"
        mock_product_create = mocker.MagicMock(return_value={"id": product_id})
        monkeypatch.setattr("stripe.Product.create", mock_product_create)
        stripe_url = "https://www.stripe.com"
        mock_stripe_account_link_create = mocker.MagicMock(return_value={"url": stripe_url})
        monkeypatch.setattr("stripe.AccountLink.create", mock_stripe_account_link_create)
        rp = (ra := org_user_free_plan.roleassignment).revenue_programs.first()
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.stripe_account_id = None
        rp.payment_provider.stripe_product_id = None
        rp.payment_provider.save()
        pp_count = Version.objects.get_for_object(rp.payment_provider).count()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        api_client.force_authenticate(user=ra.user)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {
            "requiresVerification": True,
            "reason": "past_due",
            "url": stripe_url,
            "stripeConnectStarted": False,
        }
        rp.payment_provider.refresh_from_db()
        assert rp.payment_provider.stripe_account_id == stripe_account_id
        assert rp.payment_provider.stripe_product_id == product_id
        assert Version.objects.get_for_object(rp.payment_provider).count() == pp_count + 1

    def test_happy_path_when_stripe_account_already_created_and_past_due_reqs(
        self, monkeypatch, org_user_free_plan, api_client, mocker
    ):
        stripe_account_id = "fakeId"
        stripe_url = "https://www.stripe.com"
        mock_stripe_account_retrieve = mocker.MagicMock(
            return_value={
                "charges_enabled": False,
                "id": stripe_account_id,
                "requirements": {"disabled_reason": "foo.past_due"},
                "details_submitted": True,
            }
        )
        monkeypatch.setattr("stripe.Account.retrieve", mock_stripe_account_retrieve)
        mock_stripe_account_link_create = mocker.MagicMock(return_value={"url": stripe_url})
        monkeypatch.setattr("stripe.AccountLink.create", mock_stripe_account_link_create)
        rp = (ra := org_user_free_plan.roleassignment).revenue_programs.first()
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.stripe_account_id = stripe_account_id
        rp.payment_provider.stripe_product_id = "something"
        rp.payment_provider.save()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        api_client.force_authenticate(user=ra.user)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {
            "requiresVerification": True,
            "reason": "past_due",
            "url": stripe_url,
            "stripeConnectStarted": True,
        }

    def test_happy_path_when_stripe_account_already_created_and_pending_verification(
        self, monkeypatch, org_user_free_plan, api_client, mocker
    ):
        stripe_account_id = "fakeId"
        stripe_url = "https://www.stripe.com"
        mock_stripe_account_retrieve = mocker.MagicMock(
            return_value={
                "details_submitted": True,
                "charges_enabled": False,
                "id": stripe_account_id,
                "requirements": {"disabled_reason": "foo.pending_verification"},
            }
        )
        monkeypatch.setattr("stripe.Account.retrieve", mock_stripe_account_retrieve)
        mock_stripe_account_link_create = mocker.MagicMock(return_value={"url": stripe_url})
        monkeypatch.setattr("stripe.AccountLink.create", mock_stripe_account_link_create)
        rp = (ra := org_user_free_plan.roleassignment).revenue_programs.first()
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.stripe_account_id = stripe_account_id
        rp.payment_provider.stripe_product_id = "something"
        rp.payment_provider.save()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        api_client.force_authenticate(user=ra.user)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {
            "requiresVerification": True,
            "reason": "pending_verification",
            "stripeConnectStarted": True,
        }

    def test_happy_path_when_stripe_account_newly_has_charges_enabled(
        self, org_user_free_plan, monkeypatch, api_client, mocker
    ):
        stripe_account_id = "fakeId"
        mock_stripe_account_retrieve = mocker.MagicMock(
            return_value={
                "charges_enabled": True,
                "id": stripe_account_id,
                "details_submitted": True,
            }
        )
        monkeypatch.setattr("stripe.Account.retrieve", mock_stripe_account_retrieve)
        rp = (ra := org_user_free_plan.roleassignment).revenue_programs.first()
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.stripe_account_id = stripe_account_id
        rp.payment_provider.stripe_product_id = "something"
        rp.payment_provider.save()
        pp_version_count = Version.objects.get_for_object(rp.payment_provider).count()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        api_client.force_authenticate(user=ra.user)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"requiresVerification": False}
        rp.payment_provider.refresh_from_db()
        assert rp.payment_provider.stripe_verified is True
        assert Version.objects.get_for_object(rp.payment_provider).count() == pp_version_count + 1

    def test_when_unauthenticated(self, revenue_program, api_client):
        url = reverse("handle-stripe-account-link", args=(revenue_program.pk,))
        assert api_client.post(url).status_code == status.HTTP_401_UNAUTHORIZED

    def test_when_no_role_assignment(self, revenue_program, user_no_role_assignment, api_client):
        url = reverse("handle-stripe-account-link", args=(revenue_program.pk,))
        api_client.force_authenticate(user=user_no_role_assignment)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_when_rp_not_found(self, org_user_free_plan, api_client):
        rp = (ra := org_user_free_plan.roleassignment).revenue_programs.first()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        rp.delete()
        api_client.force_authenticate(user=ra.user)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_when_dont_have_access_to_rp(self, org_user_free_plan, api_client, revenue_program):
        ra = org_user_free_plan.roleassignment
        assert revenue_program not in ra.revenue_programs.all()
        url = reverse("handle-stripe-account-link", args=(revenue_program.pk,))
        api_client.force_authenticate(user=ra.user)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_when_no_payment_provider(self, org_user_free_plan, api_client):
        rp = (ra := org_user_free_plan.roleassignment).revenue_programs.first()
        rp.payment_provider.delete()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        api_client.force_authenticate(user=ra.user)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_when_stripe_error_on_account_creation(self, org_user_free_plan, api_client, monkeypatch, mocker):
        mock_fn = mocker.MagicMock()
        mock_fn.side_effect = StripeError("Stripe blew up")
        monkeypatch.setattr("stripe.Account.create", mock_fn)
        rp = (ra := org_user_free_plan.roleassignment).revenue_programs.first()
        rp.payment_provider.stripe_account_id = None
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.stripe_product_id = None
        rp.payment_provider.save()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        api_client.force_authenticate(user=ra.user)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_when_stripe_error_on_account_retrieval(self, org_user_free_plan, api_client, monkeypatch, mocker):
        mock_fn = mocker.MagicMock()
        mock_fn.side_effect = StripeError("Stripe blew up")
        monkeypatch.setattr("stripe.Account.retrieve", mock_fn)
        rp = (ra := org_user_free_plan.roleassignment).revenue_programs.first()
        rp.payment_provider.stripe_account_id = "someId"
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.save()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        api_client.force_authenticate(user=ra.user)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_when_stripe_error_on_stripe_product_creation(self, org_user_free_plan, api_client, monkeypatch, mocker):
        mock_account_create = mocker.MagicMock(
            return_value={
                "id": "account-id",
                "charges_enabled": False,
                "requirements": {"disabled_reason": "foo.past_due"},
                "details_submitted": False,
            }
        )
        monkeypatch.setattr("stripe.Account.create", mock_account_create)
        mock_fn = mocker.MagicMock()
        mock_fn.side_effect = StripeError("Stripe blew up")
        monkeypatch.setattr("stripe.Product.create", mock_fn)
        rp = (ra := org_user_free_plan.roleassignment).revenue_programs.first()
        rp.payment_provider.stripe_account_id = None
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.stripe_product_id = None
        rp.payment_provider.save()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        api_client.force_authenticate(user=ra.user)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_when_stripe_error_on_account_link_creation(self, org_user_free_plan, api_client, monkeypatch, mocker):
        stripe_account_id = "fakefakefake"
        mock_stripe_account_retrieve = mocker.MagicMock(
            return_value={
                "details_submitted": False,
                "charges_enabled": False,
                "id": stripe_account_id,
                "requirements": {"disabled_reason": "foo.past_due"},
            }
        )
        monkeypatch.setattr("stripe.Account.retrieve", mock_stripe_account_retrieve)
        mock_account_create_link = mocker.MagicMock()
        mock_account_create_link.side_effect = StripeError("Stripe blew up")
        monkeypatch.setattr("stripe.AccountLink.create", mock_account_create_link)
        rp = (ra := org_user_free_plan.roleassignment).revenue_programs.first()
        rp.payment_provider.stripe_account_id = stripe_account_id
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.stripe_product_id = "something"
        rp.payment_provider.save()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        api_client.force_authenticate(user=ra.user)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


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
        return_value=(is_connnected := True),
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
            "activecampaign_integration_connected": is_connnected,
            "activecampaign_server_url": revenue_program.activecampaign_server_url,
        }


def test_get_stripe_account_link_return_url_when_env_var_set(settings):
    settings.STRIPE_ACCOUNT_LINK_RETURN_BASE_URL = "http://localhost:3000"
    factory = APIRequestFactory()
    assert (
        get_stripe_account_link_return_url(factory.get(""))
        == f"{settings.STRIPE_ACCOUNT_LINK_RETURN_BASE_URL}{reverse('index')}"
    )


def test_get_stripe_account_link_return_url_when_env_var_not_set(settings):
    settings.STRIPE_ACCOUNT_LINK_RETURN_BASE_URL = None
    factory = APIRequestFactory()
    assert get_stripe_account_link_return_url(factory.get("")) == f"http://testserver{reverse('index')}"


@pytest.fixture
def mailchimp_feature_flag(default_feature_flags):
    Flag = get_waffle_flag_model()
    return Flag.objects.get(name=MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME)


@pytest.fixture
def mailchimp_feature_flag_no_group_level_access(mailchimp_feature_flag):
    mailchimp_feature_flag.everyone = None
    mailchimp_feature_flag.staff = False
    mailchimp_feature_flag.superuser = False
    mailchimp_feature_flag.save()
    return mailchimp_feature_flag


@pytest.mark.django_db
class TestHandleMailchimpOauthSuccessView:
    def test_happy_path(self, mocker, org_user_free_plan, api_client):
        api_client.force_authenticate(org_user_free_plan)
        mock_task = mocker.patch(
            "apps.organizations.tasks.exchange_mailchimp_oauth_code_for_server_prefix_and_access_token.delay"
        )
        mock_task.return_value = None
        data = {
            "revenue_program": (rp_id := org_user_free_plan.roleassignment.revenue_programs.first().id),
            "mailchimp_oauth_code": (oauth_code := "something"),
        }
        response = api_client.post(reverse("handle-mailchimp-oauth-success"), data=data)
        assert response.status_code == status.HTTP_202_ACCEPTED
        mock_task.assert_called_once_with(rp_id, oauth_code)

    def test_when_not_authenticated(self, api_client, default_feature_flags):
        response = api_client.post(reverse("handle-mailchimp-oauth-success"), data={})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_when_no_roleassignment(self, user_no_role_assignment, api_client):
        response = api_client.post(reverse("handle-mailchimp-oauth-success"), data={})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.fixture(
        params=[
            "hub_admin_user",
            "superuser",
            "rp_user",
            "user_with_unexpected_role",
        ]
    )
    def non_org_admin(self, request):
        return request.getfixturevalue(request.param)

    def test_when_roleassignment_role_is_not_org_admin(self, non_org_admin, default_feature_flags, api_client):
        api_client.force_authenticate(non_org_admin)

    def test_when_dont_own_revenue_program(self, org_user_free_plan, revenue_program, api_client):
        assert revenue_program not in org_user_free_plan.roleassignment.revenue_programs.all()
        api_client.force_authenticate(org_user_free_plan)
        response = api_client.post(
            reverse("handle-mailchimp-oauth-success"),
            data={"revenue_program": revenue_program.id, "mailchimp_oauth_code": "something"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Requested revenue program not found"}

    def test_when_rp_not_found(self, org_user_free_plan, api_client):
        rp = org_user_free_plan.roleassignment.revenue_programs.first()
        rp_id = rp.id
        rp.delete()
        api_client.force_authenticate(org_user_free_plan)
        response = api_client.post(
            reverse("handle-mailchimp-oauth-success"),
            data={"revenue_program": rp_id, "mailchimp_oauth_code": "something"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Requested revenue program not found"}

    @pytest.mark.parametrize(
        ("data", "expected_response"),
        [
            ({"mailchimp_oauth_code": "something"}, {"revenue_program": ["This field is required."]}),
            ({"revenue_program": 1}, {"mailchimp_oauth_code": ["This field is required."]}),
        ],
    )
    def test_when_missing_request_data(self, data, expected_response, org_user_free_plan, api_client):
        api_client.force_authenticate(org_user_free_plan)
        response = api_client.post(reverse("handle-mailchimp-oauth-success"), data=data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == expected_response

    def test_when_user_not_have_feature_flag(
        self, org_user_free_plan, mailchimp_feature_flag_no_group_level_access, api_client
    ):
        api_client.force_authenticate(org_user_free_plan)
        response = api_client.post(reverse("handle-mailchimp-oauth-success"), data={})
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json() == {"detail": "You do not have permission to perform this action."}


@pytest.fixture(
    params=[
        "free_plan_revenue_program",
        "core_plan_revenue_program",
        "plus_plan_revenue_program",
    ]
)
def hub_admin_user_with_rps_in_ra(hub_admin_user, request):
    hub_admin_user.roleassignment.revenue_programs.add(rp := request.getfixturevalue(request.param))
    hub_admin_user.roleassignment.organization = rp.organization
    hub_admin_user.roleassignment.save()
    return hub_admin_user


@pytest.fixture
def org_user_for_email_test(org_user_free_plan, revenue_program):
    org_user_free_plan.roleassignment.organization = revenue_program.organization
    org_user_free_plan.roleassignment.revenue_programs.add(revenue_program)
    org_user_free_plan.roleassignment.save()
    return org_user_free_plan


@pytest.fixture
def rp_user_for_email_test(rp_user, revenue_program):
    rp_user.roleassignment.organization = revenue_program.organization
    rp_user.roleassignment.revenue_programs.add(revenue_program)
    rp_user.roleassignment.save()
    return rp_user


@pytest.fixture(params=["superuser", "org_user_for_email_test", "rp_user_for_email_test", "hub_admin_user"])
def test_email_user(request, revenue_program):
    user = request.getfixturevalue(request.param)
    if user.roleassignment:
        user.roleassignment.revenue_programs.add(revenue_program)
        user.roleassignment.save()
    return user


@pytest.mark.django_db
class TestSendTestEmail:
    def test_when_dont_own_revenue_program(self, org_user_free_plan, revenue_program, api_client):
        assert revenue_program not in org_user_free_plan.roleassignment.revenue_programs.all()
        api_client.force_authenticate(org_user_free_plan)
        response = api_client.post(
            reverse("send-test-email"),
            data={"revenue_program": revenue_program.id, "email_name": "something"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Requested revenue program not found"}

    @pytest.mark.parametrize(
        ("data", "expected_response"),
        [
            ({"email_name": "something"}, {"revenue_program": ["This field is required."]}),
            ({"revenue_program": 1}, {"email_name": ["This field is required."]}),
        ],
    )
    def test_when_missing_request_data(self, data, expected_response, org_user_free_plan, api_client):
        api_client.force_authenticate(org_user_free_plan)
        response = api_client.post(reverse("send-test-email"), data=data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == expected_response

    def test_show_upgrade_prompt_conditionality_around_org_plan(
        self, hub_admin_user_with_rps_in_ra, api_client, mocker
    ):
        rp = hub_admin_user_with_rps_in_ra.roleassignment.revenue_programs.first()
        api_client.force_authenticate(hub_admin_user_with_rps_in_ra)
        mocker.patch("apps.emails.tasks.get_test_magic_link", return_value="fake_magic_link")
        send_email_spy = mocker.spy(send_templated_email, "delay")

        api_client.post(
            reverse("send-test-email"),
            data={"revenue_program": rp.id, "email_name": "reminder"},
        )

        title_prompt = "Can I brand my email receipts?"
        description_prompt = "Yes! Upgrade to Core to use your logo and branding for all email receipts."
        link_prompt = "https://fundjournalism.org/pricing/"

        send_email_spy.assert_called_once()

        if rp.organization.plan.name == FreePlan.name:
            expect_present = (title_prompt, description_prompt, link_prompt)
            expect_missing = ()
        else:
            expect_present = ()
            expect_missing = (title_prompt, description_prompt, link_prompt)

        for x in expect_present:
            assert x in send_email_spy.call_args[0][3]

        for x in expect_missing:
            assert x not in send_email_spy.call_args[0][3]

    def test_invalid_email_name_independent_of_user_role(self, test_email_user, revenue_program, api_client):
        api_client.force_authenticate(test_email_user)
        rp_pk = (
            test_email_user.roleassignment.revenue_programs.first().id
            if test_email_user.roleassignment.revenue_programs.first()
            else revenue_program.id
        )
        response = api_client.post(
            reverse("send-test-email"),
            data={"revenue_program": rp_pk, "email_name": "something"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"email_name": ["Invalid email name: something"]}

    def test_send_test_receipt_email(self, test_email_user, revenue_program, mocker, api_client, settings):
        settings.CELERY_TASK_ALWAYS_EAGER = True
        api_client.force_authenticate(test_email_user)
        rp = (
            test_email_user.roleassignment.revenue_programs.first()
            if test_email_user.roleassignment.revenue_programs.first()
            else revenue_program
        )

        mocker.patch("apps.emails.tasks.get_test_magic_link", return_value="fake_magic_link")
        send_receipt_email_spy = mocker.spy(send_receipt_email, "delay")
        expected_data = make_send_test_contribution_email_data(test_email_user, rp)

        api_client.post(
            reverse("send-test-email"),
            data={"revenue_program": rp.id, "email_name": "receipt"},
        )
        send_receipt_email_spy.assert_called_once_with(expected_data)

    def test_send_test_reminder_email(self, test_email_user, revenue_program, mocker, api_client, settings):
        settings.CELERY_ALWAYS_EAGER = True
        api_client.force_authenticate(test_email_user)
        rp = (
            test_email_user.roleassignment.revenue_programs.first()
            if test_email_user.roleassignment.revenue_programs.first()
            else revenue_program
        )

        send_email_spy = mocker.spy(send_templated_email, "delay")
        mocker.patch("apps.emails.tasks.get_test_magic_link", return_value="fake_magic_link")
        expected_data = make_send_test_contribution_email_data(test_email_user, rp)

        api_client.post(
            reverse("send-test-email"),
            data={"revenue_program": rp.id, "email_name": "reminder"},
        )
        send_email_spy.assert_called_once_with(
            test_email_user.email,
            f"Reminder: {rp.name} scheduled contribution",
            render_to_string("recurring-contribution-email-reminder.txt", expected_data),
            render_to_string("recurring-contribution-email-reminder.html", expected_data),
        )

    def test_send_test_magic_link_email(self, test_email_user, revenue_program, mocker, api_client, settings):
        settings.CELERY_ALWAYS_EAGER = True
        api_client.force_authenticate(test_email_user)
        rp = (
            test_email_user.roleassignment.revenue_programs.first()
            if test_email_user.roleassignment.revenue_programs.first()
            else revenue_program
        )

        send_email_spy = mocker.spy(send_templated_email, "delay")
        mocker.patch("apps.emails.tasks.get_test_magic_link", return_value="fake_magic_link")
        expected_data = make_send_test_magic_link_email_data(test_email_user, rp)
        expected_data["style"]["logo_url"] = f"{settings.SITE_URL}/static/nre-logo-white.png"
        api_client.post(
            reverse("send-test-email"),
            data={"revenue_program": rp.id, "email_name": "magic_link"},
        )
        send_email_spy.assert_called_once_with(
            test_email_user.email,
            "Manage your contributions",
            render_to_string("nrh-manage-contributions-magic-link.txt", expected_data),
            render_to_string("nrh-manage-contributions-magic-link.html", expected_data),
        )
