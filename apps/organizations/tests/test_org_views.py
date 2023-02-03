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

from apps.organizations.models import (
    TAX_ID_MAX_LENGTH,
    TAX_ID_MIN_LENGTH,
    Organization,
    OrganizationManager,
    RevenueProgram,
    RevenueProgramManager,
)
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.organizations.views import RevenueProgramViewSet, get_stripe_account_link_return_url
from apps.users.choices import Roles
from apps.users.tests.factories import create_test_user


user_model = get_user_model()

fake = Faker()


@pytest.mark.django_db
class TestOrganizationViewSet:
    @pytest.mark.parametrize(
        "method,url_name,has_data",
        (
            ("post", "organization-list", True),
            ("put", "organization-detail", True),
            ("patch", "organization-detail", True),
            ("delete", "organization-detail", False),
        ),
    )
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
    def test_restricted_users(self, method, url_name, has_data, api_client, user, organization):
        """Test each combo of method and restricted user to show that server responds with appropriate status code.

        Note that we do not test for absence of side-effects -- for instance, we don't prove that the count
        of RevenuePrograms does not decrement by one when a delete call is made. We take the server code's at face value
        and assume that the ORM layer is in sync with the semantics of the status codes.
        """
        url_args = () if method == "organization-list" else (organization.id,)
        url = reverse(url_name, args=url_args)
        if user:
            api_client.force_authenticate(user)
        kwargs = {}
        if has_data:
            kwargs["data"] = {}
        response = getattr(api_client, method)(url, **kwargs)
        ra = getattr(user, "get_role_assignment", lambda: str)()
        if any(
            [
                user is None and method == "post",
                ra is None and method == "post",
                ra and method == "post",
            ]
        ):
            expected_status_code = status.HTTP_404_NOT_FOUND
        elif user is None and method != "post":
            expected_status_code = status.HTTP_401_UNAUTHORIZED
        else:
            expected_status_code = status.HTTP_403_FORBIDDEN
        assert response.status_code == expected_status_code

    @pytest.mark.parametrize(
        "method,url_name,has_data",
        (
            ("post", "organization-list", True),
            ("put", "organization-detail", True),
            ("patch", "organization-detail", True),
            ("delete", "organization-detail", False),
        ),
    )
    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_permissive_users(self, method, url_name, has_data, api_client, user, organization):
        """Test each combo of method and restricted user to show that server responds with appropriate status code.

        There is a high level of with the method above as the if/else combinations became too complex so a bit of
        duplicate code is a trade off for clarity/debugging capability
        """
        url_args = () if method == "organization-list" else (organization.id,)
        url = reverse(url_name, args=url_args)
        if user:
            api_client.force_authenticate(user)
        kwargs = {}
        if has_data:
            kwargs["data"] = {}
        response = getattr(api_client, method)(url, **kwargs)
        ra = getattr(user, "get_role_assignment", lambda: str)()
        if any(
            [
                user is None and method == "post",
                ra is None and method == "post",
                ra and method == "post",
            ]
        ):
            expected_status_code = status.HTTP_404_NOT_FOUND
        elif (method == "put" or method == "delete") and ra.organization:
            expected_status_code = status.HTTP_403_FORBIDDEN
        elif method == "patch":
            expected_status_code = status.HTTP_200_OK
        else:
            expected_status_code = status.HTTP_405_METHOD_NOT_ALLOWED
        assert response.status_code == expected_status_code

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
            spy = mocker.spy(OrganizationManager, "filtered_by_role_assignment")
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
            pytest_cases.fixture_ref("user_no_role_assignment"),
            pytest_cases.fixture_ref("contributor_user"),
            None,
        ),
    )
    def test_retrieve_when_unexpected_user(self, user, api_client, organization):
        """Show that unexpected users can't retrieve organizations"""
        api_client.force_authenticate(user)
        response = api_client.get(reverse("organization-detail", args=(organization.id,)))
        if not user:
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
        else:
            assert response.status_code == status.HTTP_403_FORBIDDEN

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
            spy = mocker.spy(OrganizationManager, "filtered_by_role_assignment")
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
        "user",
        (
            pytest_cases.fixture_ref("user_no_role_assignment"),
            pytest_cases.fixture_ref("contributor_user"),
            None,
        ),
    )
    def test_list_when_unexpected_user(self, user, api_client):
        """Show that unexpected users can't retrieve organizations"""
        api_client.force_authenticate(user)
        response = api_client.get(reverse("organization-list"))
        if not user:
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
        else:
            assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("org_user_free_plan"),
        ),
    )
    def test_expected_users_can_patch(self, user, api_client):
        revenue_program = RevenueProgram.objects.first()
        if not revenue_program:
            # for superuser, since an org association is not required
            revenue_program = RevenueProgramFactory()
        new_name = "new-name"
        api_client.force_authenticate(user)
        data = {"name": new_name}
        response = api_client.patch(reverse("revenue-program-detail", args=(revenue_program.id,)), data=data)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["name"] == new_name

    def test_cannot_patch_another_org(self, organization, api_client):
        other_org = OrganizationFactory()
        other_org_user = create_test_user(
            role_assignment_data={"role_type": Roles.ORG_ADMIN, "organization": other_org}
        )
        api_client.force_authenticate(other_org_user)
        revenue_program = RevenueProgramFactory(organization=organization)
        assert other_org_user.roleassignment.organization != organization
        response = api_client.patch(reverse("revenue-program-detail", args=(revenue_program.id,)), data={"name": "foo"})
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
def rp_invalid_patch_data_unexpected_fields():
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
            spy = mocker.spy(RevenueProgramManager, "filtered_by_role_assignment")
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
            spy = mocker.spy(RevenueProgramManager, "filtered_by_role_assignment")
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
                pytest_cases.fixture_ref("rp_invalid_patch_data_unexpected_fields"),
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
            spy = mocker.spy(RevenueProgramManager, "filtered_by_role_assignment")
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
