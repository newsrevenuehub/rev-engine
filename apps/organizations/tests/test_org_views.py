from unittest import mock

from django.contrib.auth import get_user_model

import pytest
import pytest_cases
from faker import Faker
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APIRequestFactory
from reversion.models import Version
from stripe.error import StripeError
from waffle import get_waffle_flag_model

from apps.common.constants import MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME
from apps.organizations.models import (
    TAX_ID_MAX_LENGTH,
    TAX_ID_MIN_LENGTH,
    Organization,
    OrganizationQuerySet,
    RevenueProgram,
    RevenueProgramQuerySet,
)
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.organizations.views import RevenueProgramViewSet, get_stripe_account_link_return_url
from apps.users.choices import Roles


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


@pytest.mark.django_db
class TestOrganizationViewSet:
    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_retrieve_when_expected_user(self, user, api_client, mocker):
        """Show that expected users can retrieve only permitted organizations

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
            for id in query.values_list("id", flat=True):
                response = api_client.get(reverse("organization-detail", args=(id,)))
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
            for id in query.values_list("id", flat=True):
                response = api_client.get(reverse("organization-detail", args=(id,)))
                assert response.status_code == status.HTTP_200_OK
            for id in unpermitted.values_list("id", flat=True):
                response = api_client.get(reverse("organization-detail", args=(id,)))
                assert response.status_code == status.HTTP_404_NOT_FOUND
            # this test is valid insofar as the spyed on method `filtered_by_role_assignment` is called, and has been
            # tested elsewhere and proven to be valid. Here, we just need to show that it gets called for each time we tried to retrieve
            # an Organization.
            assert spy.call_count == Organization.objects.count()

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("user_no_role_assignment"),
            pytest_cases.fixture_ref("contributor_user"),
            None,
        ),
    )
    def test_retrieve_when_unmpermitted_user(self, user, api_client, organization):
        """Show that unmpermitted users cannot retrieve an organization."""
        if user:
            api_client.force_authenticate(user)
        response = api_client.get(reverse("organization-list", args=(organization.id,)))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_list_when_expected_user(self, user, api_client, mocker):
        """Show that expected users can list only permitted organizations

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
            assert len(orgs := response.json()) == query.count()
            assert set([x["id"] for x in orgs]) == set(list(query.values_list("id", flat=True)))

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
            assert len(orgs := response.json()) == query.count()
            assert set([x["id"] for x in orgs]) == set(list(query.values_list("id", flat=True)))

            # this test is valid insofar as the spyed on method `filtered_by_role_assignment` is called, and has been
            # tested elsewhere and proven to be valid. Here, we just need to show that it gets called.
            assert spy.call_count == 1

    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_list_when_unexpected_user(self, user, expected_status, api_client):
        """Show that unexpected users can't list organizations"""
        api_client.force_authenticate(user)
        response = api_client.get(reverse("organization-list"))
        assert response.status_code == expected_status

    @pytest.mark.parametrize("method,data", (("post", {}), ("put", {}), ("delete", None)))
    @pytest_cases.parametrize(
        "user,expected_status",
        (
            (pytest_cases.fixture_ref("org_user_free_plan"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("superuser"), status.HTTP_405_METHOD_NOT_ALLOWED),
            (pytest_cases.fixture_ref("rp_user"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("hub_admin_user"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("user_no_role_assignment"), status.HTTP_403_FORBIDDEN),
            (pytest_cases.fixture_ref("contributor_user"), status.HTTP_403_FORBIDDEN),
            (None, status.HTTP_401_UNAUTHORIZED),
        ),
    )
    def test_unpermitted_methods(self, method, data, user, expected_status, organization, api_client):
        if user:
            api_client.force_authenticate(user)
        kwargs = {} if data is None else {"data": data}
        response = getattr(api_client, method)(reverse("organization-detail", args=(organization.id,)), **kwargs)
        assert response.status_code == expected_status

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("org_user_free_plan"),
        ),
    )
    @pytest_cases.parametrize(
        "data,expect_status_code,error_response,has_fake_fields",
        (
            (pytest_cases.fixture_ref("org_valid_patch_data"), status.HTTP_200_OK, None, False),
            (
                pytest_cases.fixture_ref("org_invalid_patch_data_name_too_long"),
                status.HTTP_400_BAD_REQUEST,
                {"name": ["Ensure this field has no more than 255 characters."]},
                False,
            ),
            (
                pytest_cases.fixture_ref("invalid_patch_data_unexpected_fields"),
                status.HTTP_200_OK,
                {},
                True,
            ),
        ),
    )
    def test_patch_when_expected_user(
        self, user, data, expect_status_code, error_response, has_fake_fields, organization, mocker, api_client
    ):
        """Show that expected users can patch what they should be able to, and cannot what they shouldn't.

        Specifically, superusers should be able to patch any org (but only permitted fields), while org users should only be able
        to patch permitted fields on an org they own, and not unowned orgs
        """
        api_client.force_authenticate(user)
        if user.is_superuser:
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
            assert organization.id != user.roleassignment.organization
            unpermitted_response = api_client.patch(reverse("organization-detail", args=(organization.id,)), data=data)
            assert unpermitted_response.status_code == status.HTTP_404_NOT_FOUND
            last_modified = user.roleassignment.organization.modified
            permitted_response = api_client.patch(
                reverse("organization-detail", args=((permitted_org := user.roleassignment.organization).id,)),
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

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("user_no_role_assignment"),
            pytest_cases.fixture_ref("contributor_user"),
            pytest_cases.fixture_ref("rp_user"),
            None,
        ),
    )
    def test_patch_when_unexpected_user(self, user, api_client, organization):
        """Show that unexpected users cannot patch an Org"""
        api_client.force_authenticate(user)
        response = api_client.patch(reverse("organization-detail", args=(organization.id,)), data={})
        # if unauthed, get 401
        if not user:
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
        # if unexpected role assignment role type
        else:
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_patch_different_org(self, org_user_free_plan, api_client, organization):
        """Show that only org admins can access this patch endpoint"""
        api_client.force_authenticate(org_user_free_plan)
        response = api_client.patch(reverse("organization-detail", args=(organization.id,)), data={})
        assert response.status_code == status.HTTP_404_NOT_FOUND


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
def invalid_patch_data_unexpected_fields():
    return {"foo": "bar"}


@pytest.mark.django_db
class TestRevenueProgramViewSet:
    def test_pagination_disabled(self):
        assert RevenueProgramViewSet.pagination_class is None

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_retrieve_rp_when_expected_user(self, user, api_client, mocker):
        """Show that typical users can retrieve what they should be able to, and can't retrieve what they shouldn't

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

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("user_no_role_assignment"),
            pytest_cases.fixture_ref("contributor_user"),
            None,
        ),
    )
    def test_retrieve_rp_when_unexpected_user(self, user, api_client, revenue_program):
        """Show that typical users can retrieve what they should be able to, and can't retrieve what they shouldn't

        NB: This test treats RevenueProgram.objects.filtered_by_role_assignment as a blackbox. That function is well-tested
        elsewhere.
        """
        api_client.force_authenticate(user)
        response = api_client.get(reverse("revenue-program-detail", args=(revenue_program.id,)))
        # if unauthed, get 401
        if not user:
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
        # if unexpected role assignment role type
        else:
            assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_list_when_expected_user(self, user, api_client, mocker):
        """Show that typical users can retrieve what they should be able to, and can't retrieve what they shouldn't

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
            assert len(rps := response.json()) == query.count()
            assert set([x["id"] for x in rps]) == set(list(query.values_list("id", flat=True)))

        else:
            query = RevenueProgram.objects.filtered_by_role_assignment(user.roleassignment)
            spy = mocker.spy(RevenueProgramQuerySet, "filtered_by_role_assignment")
            unpermitted = RevenueProgram.objects.exclude(id__in=query.values_list("id", flat=True))
            assert query.count()
            assert unpermitted.count()
            response = api_client.get(reverse("revenue-program-list"))
            assert len(rps := response.json()) == query.count()
            assert set([x["id"] for x in rps]) == set(list(query.values_list("id", flat=True)))

            # this test is valid insofar as the spyed on method `filtered_by_role_assignment` is called, and has been
            # tested elsewhere and proven to be valid. Here, we just need to show that it gets called.
            assert spy.call_count == 1

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("user_no_role_assignment"),
            pytest_cases.fixture_ref("contributor_user"),
            None,
        ),
    )
    def test_list_when_unexpected_user(self, user, api_client):
        """Show that unexpected users cannot retrieve any revenue programs."""
        RevenueProgramFactory.create_batch(size=2)
        api_client.force_authenticate(user)
        response = api_client.get(reverse("revenue-program-list"))
        # if unauthed, get 401
        if not user:
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
        # if unexpected role assignment role type
        else:
            assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("user_no_role_assignment"),
            pytest_cases.fixture_ref("contributor_user"),
            None,
        ),
    )
    def test_delete(self, user, api_client):
        """Show that nobody can delete"""
        rp = RevenueProgramFactory()
        api_client.force_authenticate(user)
        response = api_client.delete(reverse("revenue-program-detail", args=(rp.id,)))
        assert (
            response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
            if getattr(user, "is_superuser", None)
            else status.HTTP_403_FORBIDDEN
        )

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("user_no_role_assignment"),
            pytest_cases.fixture_ref("contributor_user"),
            None,
        ),
    )
    def test_put(self, user, api_client):
        """Show that nobody can put"""
        rp = RevenueProgramFactory()
        api_client.force_authenticate(user)
        response = api_client.put(reverse("revenue-program-detail", args=(rp.id,)), data={})
        assert (
            response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
            if getattr(user, "is_superuser", None)
            else status.HTTP_403_FORBIDDEN
        )

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    @pytest_cases.parametrize(
        "data,expect_status_code,error_response,has_fake_fields",
        (
            (pytest_cases.fixture_ref("rp_valid_patch_data"), status.HTTP_200_OK, None, False),
            (
                pytest_cases.fixture_ref("rp_invalid_patch_data_tax_id_too_short"),
                status.HTTP_400_BAD_REQUEST,
                {"tax_id": ["Ensure this field has at least 9 characters."]},
                False,
            ),
            (
                pytest_cases.fixture_ref("rp_invalid_patch_data_tax_id_too_long"),
                status.HTTP_400_BAD_REQUEST,
                {"tax_id": ["Ensure this field has no more than 9 characters."]},
                False,
            ),
            (
                pytest_cases.fixture_ref("invalid_patch_data_unexpected_fields"),
                status.HTTP_200_OK,
                {},
                True,
            ),
        ),
    )
    def test_patch_when_expected_user(
        self, user, data, expect_status_code, error_response, has_fake_fields, api_client, revenue_program, mocker
    ):
        """Show that expected users are able to patch (only) permitted RPs, with valid data"""
        api_client.force_authenticate(user)
        if user.is_superuser:
            response = api_client.patch(reverse("revenue-program-detail", args=(revenue_program.id,)), data=data)
            assert response.status_code == expect_status_code
            if error_response:
                assert response.json() == error_response
            elif not has_fake_fields:
                revenue_program.refresh_from_db()
                for key in data:
                    assert response.json()[key] == getattr(revenue_program, key)
        else:
            spy = mocker.spy(RevenueProgramQuerySet, "filtered_by_role_assignment")
            assert revenue_program.id not in user.roleassignment.revenue_programs.all().values_list("id", flat=True)
            unpermitted_response = api_client.patch(reverse("revenue-program-detail", args=(revenue_program.id,)))
            assert unpermitted_response.status_code == status.HTTP_404_NOT_FOUND
            assert unpermitted_response.json() == {"detail": "Not found."}
            permitted_rp = user.roleassignment.revenue_programs.first()
            last_modified = permitted_rp.modified
            permitted_response = api_client.patch(reverse("revenue-program-detail", args=(permitted_rp.id,)), data=data)
            assert permitted_response.status_code == expect_status_code
            permitted_rp.refresh_from_db()
            if error_response:
                assert permitted_response.json() == error_response
                assert permitted_rp.modified == last_modified
            elif not has_fake_fields:
                for key in data:
                    assert permitted_response.json()[key] == getattr(permitted_rp, key)
            # once for each of the calls to the patch endpoint
            assert spy.call_count == 2

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("hub_admin_user"),
            pytest_cases.fixture_ref("user_no_role_assignment"),
            pytest_cases.fixture_ref("contributor_user"),
            pytest_cases.fixture_ref("rp_user"),
            None,
        ),
    )
    def test_patch_when_unexpected_user(self, user, api_client, revenue_program):
        """Show that unexpected users cannot patch an RP"""
        api_client.force_authenticate(user)
        response = api_client.patch(reverse("revenue-program-detail", args=(revenue_program.id,)), data={})
        # if unauthed, get 401
        if not user:
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
        # if unexpected role assignment role type
        else:
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_patch_different_org(self, org_user_free_plan, api_client, revenue_program):
        """Show that org admins cannot patch another org's rp"""
        api_client.force_authenticate(org_user_free_plan)
        response = api_client.patch(reverse("revenue-program-detail", args=(revenue_program.id,)), data={})
        assert response.status_code == status.HTTP_404_NOT_FOUND


class FakeStripeProduct:
    def __init__(self, id):
        self.id = id


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

    def test_happy_path_when_stripe_account_not_yet_created(self, monkeypatch, org_user_free_plan, api_client):
        stripe_account_id = "fakeId"
        mock_stripe_account_create = mock.MagicMock(
            return_value={
                "details_submitted": False,
                "charges_enabled": False,
                "id": stripe_account_id,
                "requirements": {"disabled_reason": "foo.past_due"},
            }
        )
        monkeypatch.setattr("stripe.Account.create", mock_stripe_account_create)
        product_id = "some_id"
        mock_product_create = mock.MagicMock(return_value={"id": product_id})
        monkeypatch.setattr("stripe.Product.create", mock_product_create)
        stripe_url = "https://www.stripe.com"
        mock_stripe_account_link_create = mock.MagicMock(return_value={"url": stripe_url})
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
        self, monkeypatch, org_user_free_plan, api_client
    ):
        stripe_account_id = "fakeId"
        stripe_url = "https://www.stripe.com"
        mock_stripe_account_retrieve = mock.MagicMock(
            return_value={
                "charges_enabled": False,
                "id": stripe_account_id,
                "requirements": {"disabled_reason": "foo.past_due"},
                "details_submitted": True,
            }
        )
        monkeypatch.setattr("stripe.Account.retrieve", mock_stripe_account_retrieve)
        mock_stripe_account_link_create = mock.MagicMock(return_value={"url": stripe_url})
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
        self, monkeypatch, org_user_free_plan, api_client
    ):
        stripe_account_id = "fakeId"
        stripe_url = "https://www.stripe.com"
        mock_stripe_account_retrieve = mock.MagicMock(
            return_value={
                "details_submitted": True,
                "charges_enabled": False,
                "id": stripe_account_id,
                "requirements": {"disabled_reason": "foo.pending_verification"},
            }
        )
        monkeypatch.setattr("stripe.Account.retrieve", mock_stripe_account_retrieve)
        mock_stripe_account_link_create = mock.MagicMock(return_value={"url": stripe_url})
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
        self, org_user_free_plan, monkeypatch, api_client
    ):
        stripe_account_id = "fakeId"
        mock_stripe_account_retrieve = mock.MagicMock(
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
        assert revenue_program not in (ra := org_user_free_plan.roleassignment).revenue_programs.all()
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

    def test_when_stripe_error_on_account_creation(self, org_user_free_plan, api_client, monkeypatch):
        mock_fn = mock.MagicMock()
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

    def test_when_stripe_error_on_account_retrieval(self, org_user_free_plan, api_client, monkeypatch):
        mock_fn = mock.MagicMock()
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

    def test_when_stripe_error_on_stripe_product_creation(self, org_user_free_plan, api_client, monkeypatch):
        mock_account_create = mock.MagicMock(
            return_value={
                "id": "account-id",
                "charges_enabled": False,
                "requirements": {"disabled_reason": "foo.past_due"},
                "details_submitted": False,
            }
        )
        monkeypatch.setattr("stripe.Account.create", mock_account_create)
        mock_fn = mock.MagicMock()
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

    def test_when_stripe_error_on_account_link_creation(self, org_user_free_plan, api_client, monkeypatch):
        stripe_account_id = "fakefakefake"
        mock_stripe_account_retrieve = mock.MagicMock(
            return_value={
                "details_submitted": False,
                "charges_enabled": False,
                "id": stripe_account_id,
                "requirements": {"disabled_reason": "foo.past_due"},
            }
        )
        monkeypatch.setattr("stripe.Account.retrieve", mock_stripe_account_retrieve)
        mock_account_create_link = mock.MagicMock()
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


@pytest.fixture()
def settings_stripe_acccount_link_env_var_set(settings):
    settings.STRIPE_ACCOUNT_LINK_RETURN_BASE_URL = "http://localhost:3000"


def test_get_stripe_account_link_return_url_when_env_var_set(settings_stripe_acccount_link_env_var_set):
    factory = APIRequestFactory()
    assert get_stripe_account_link_return_url(factory.get("")) == f"http://localhost:3000{reverse('index')}"


def test_get_stripe_account_link_return_url_when_env_var_not_set():
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


class TestMailchimpIntegrationViewStub:
    """These tests are narrowly meant to demonstrate business logic around the "mailchimp-integration-access" flag.

    For now, we just test around a stub API endpoint to prove the flag is configured as required.
    """

    @pytest_cases.parametrize(
        "user,mailchimp_flag_kwargs,expect_access",
        (
            (
                pytest_cases.fixture_ref("superuser"),
                {
                    "superuser": True,
                    "everyone": None,
                    "staff": False,
                },
                True,
            ),
            (
                pytest_cases.fixture_ref("superuser"),
                {
                    "superuser": False,
                    "everyone": None,
                    "staff": False,
                },
                False,
            ),
            (
                pytest_cases.fixture_ref("superuser"),
                {
                    "superuser": False,
                    "everyone": True,
                    "staff": False,
                },
                True,
            ),
            (
                pytest_cases.fixture_ref("superuser"),
                {
                    "superuser": False,
                    "everyone": True,
                    "staff": False,
                },
                True,
            ),
            (
                pytest_cases.fixture_ref("superuser"),
                {
                    "superuser": False,
                    "everyone": False,
                    "staff": True,
                },
                True,
            ),
            (
                pytest_cases.fixture_ref("admin_user"),
                {
                    "superuser": False,
                    "everyone": False,
                    "staff": True,
                },
                True,
            ),
            (
                pytest_cases.fixture_ref("admin_user"),
                {
                    "superuser": False,
                    "everyone": False,
                    "staff": False,
                },
                False,
            ),
            (
                pytest_cases.fixture_ref("admin_user"),
                {
                    "superuser": False,
                    "everyone": True,
                    "staff": False,
                },
                True,
            ),
            (
                pytest_cases.fixture_ref("org_user_free_plan"),
                {
                    "superuser": True,
                    "everyone": False,
                    "staff": True,
                },
                False,
            ),
            (
                pytest_cases.fixture_ref("org_user_free_plan"),
                {
                    "superuser": True,
                    "everyone": True,
                    "staff": True,
                },
                True,
            ),
        ),
    )
    def test_feature_flag_works(self, user, mailchimp_flag_kwargs, expect_access, mailchimp_feature_flag, api_client):
        """Show that flag can be used to control access based on superuser, everyone, and staff attributes."""
        for k, v in mailchimp_flag_kwargs.items():
            setattr(mailchimp_feature_flag, k, v)
        mailchimp_feature_flag.save()
        api_client.force_authenticate(user)
        response = api_client.get(reverse("mail_chimp_integration_stub"))
        assert response.status_code == status.HTTP_200_OK if expect_access else status.HTTP_403_FORBIDDEN

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("admin_user"),
            pytest_cases.fixture_ref("org_user_free_plan"),
        ),
    )
    def test_feature_flag_works_with_individual_assignment(
        self, user, mailchimp_feature_flag_no_group_level_access, api_client
    ):
        """Show that flag can be used to grant individual users resource access"""
        mailchimp_feature_flag_no_group_level_access.users.add(user)
        mailchimp_feature_flag_no_group_level_access.save()
        api_client.force_authenticate(user)
        assert api_client.get(reverse("mail_chimp_integration_stub")).status_code == status.HTTP_200_OK
