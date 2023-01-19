from unittest import mock

from django.contrib.auth import get_user_model

import pytest
import pytest_cases
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APIClient, APIRequestFactory
from reversion.models import Version
from stripe.error import StripeError

from apps.api.tests import RevEngineApiAbstractTestCase
from apps.organizations.models import Organization, RevenueProgram, RevenueProgramManager, Roles
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.organizations.views import get_stripe_account_link_return_url
from apps.users.tests.factories import RoleAssignmentFactory, UserFactory, create_test_user


user_model = get_user_model()


# class OrganizationViewSetTest(RevEngineApiAbstractTestCase):
#     model_factory = OrganizationFactory
#     model = Organization

#     def setUp(self):
#         super().setUp()
#         self.is_authed_user = create_test_user()
#         self.post_data = {}
#         self.expected_user_types = (
#             self.superuser,
#             self.hub_user,
#             self.org_user,
#             self.rp_user,
#         )
#         self.detail_url = reverse("organization-detail", args=(self.org1.pk,))
#         self.list_url = reverse("organization-list")

#     def assert_user_can_retrieve_an_org(self, user):
#         response = self.assert_user_can_get(self.detail_url, user)
#         self.assertEqual(response.json()["id"], self.org1.pk)

#     def assert_user_cannot_udpate_an_org(self, user):
#         last_modified = self.org1.modified
#         self.assert_user_cannot_patch_because_not_implemented(self.detail_url, user)
#         self.org1.refresh_from_db()
#         self.assertEqual(last_modified, self.org1.modified)

#     def assert_user_cannot_create_an_org(self, user):
#         before_count = Organization.objects.count()
#         self.assert_user_cannot_post_because_not_implemented(self.list_url, user)
#         self.assertEqual(before_count, Organization.objects.count())

#     def assert_user_cannot_delete_an_org(self, user):
#         self.assertGreaterEqual(before_count := Organization.objects.count(), 1)
#         self.assert_user_cannot_delete_because_not_implemented(self.detail_url, user)
#         self.assertEqual(before_count, Organization.objects.count())

#     def test_unauthed_cannot_access(self):
#         self.assert_unauthed_cannot_get(self.detail_url)
#         self.assert_unauthed_cannot_get(self.list_url)
#         self.assert_unauthed_cannot_delete(self.detail_url)
#         self.assert_unauthed_cannot_patch(self.detail_url)
#         self.assert_unauthed_cannot_put(self.detail_url)

#     def test_expected_user_types_can_only_read(self):
#         for user in self.expected_user_types:
#             self.assert_user_can_retrieve_an_org(user)
#             self.assert_user_cannot_create_an_org(user)
#             self.assert_user_cannot_udpate_an_org(user)
#             self.assert_user_cannot_delete_an_org(user)
#         for user, count in [
#             (self.superuser, Organization.objects.count()),
#             (self.hub_user, Organization.objects.count()),
#             (self.org_user, 1),
#             (self.rp_user, 1),
#         ]:
#             self.assert_user_can_list(self.list_url, user, count, results_are_flat=True)

#     def test_unexpected_role_type(self):
#         novel = create_test_user(role_assignment_data={"role_type": "this-is-new"})
#         self.assert_user_cannot_get(
#             reverse("organization-list"),
#             novel,
#             expected_status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#         )


@pytest.mark.django_db
class TestRevenueProgramViewSet:
    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
            pytest_cases.fixture_ref("user_no_role_assignment"),
            None,
        ),
    )
    def test_retrieve_rp(self, user, client, mocker):
        """Show that typical users can retrieve what they should be able to, and can't retrieve what they shouldn't

        NB: This test treats RevenueProgram.objects.filtered_by_role_assignment as a blackbox. That function is well-tested
        elsewhere.
        """
        # ensure there will be RPs that org admin and rp admin won't be able to access, but that superuser should be able to
        # access
        new_org = OrganizationFactory()
        RevenueProgramFactory.create_batch(size=2, organization=new_org)
        client.force_authenticate(user)

        # unauthed and users without role assignment can't retrieve any
        if not (user and user.get_role_assignment()):
            query = RevenueProgram.objects.all()
            assert query.count()
            for rp_id in query.values_list("id", flat=True):
                response = client.get(reverse("revenue-program-detail", args=(rp_id,)))
                assert response.status_code == status.HTTP_403_FORBIDDEN if user else status.HTTP_401_UNAUTHORIZED

        # superuser can retrieve all
        elif user.is_superuser:
            query = RevenueProgram.objects.all()
            assert query.count()
            for rp_id in query.values_list("id", flat=True):
                response = client.get(reverse("revenue-program-detail", args=(rp_id,)))
                assert response.status_code == status.HTTP_200_OK
        # users with role assignments should only see what's permitted for them
        elif user.get_role_assignment() is not None:
            query = RevenueProgram.objects.filtered_by_role_assignment(user.roleassignment)
            spy = mocker.spy(RevenueProgramManager, "filtered_by_role_assignment")

            unpermitted = RevenueProgram.objects.exclude(id__in=query.values_list("id", flat=True))
            assert query.count()
            assert unpermitted.count()
            for rp_id in query.values_list("id", flat=True):
                response = client.get(reverse("revenue-program-detail", args=(rp_id,)))
                assert response.status_code == status.HTTP_200_OK
            for rp_id in unpermitted.values_list("id", flat=True):
                response = client.get(reverse("revenue-program-detail", args=(rp_id,)))
                assert response.status_code == status.HTTP_404_NOT_FOUND
            # assert about spy calls
        else:
            pytest.fail("Unexpected test parameter combination")

    @pytest_cases.parametrize(
        "user",
        (
            pytest_cases.fixture_ref("org_user_free_plan"),
            pytest_cases.fixture_ref("rp_user"),
            pytest_cases.fixture_ref("superuser"),
        ),
    )
    def test_list_when_expected_user(self, user, client, mocker):
        """Show that typical users can retrieve what they should be able to, and can't retrieve what they shouldn't

        NB: This test treats RevenueProgram.objects.filtered_by_role_assignment as a blackbox. That function is well-tested
        elsewhere.
        """
        # ensure there will be RPs that org admin and rp admin won't be able to access, but that superuser should be able to
        # access
        new_org = OrganizationFactory()
        RevenueProgramFactory.create_batch(size=2, organization=new_org)

        client.force_authenticate(user)

        # superuser can retrieve all
        if user.is_superuser:
            query = RevenueProgram.objects.all()
            assert query.count()
            response = client.get(reverse("revenue-program-list"))
            assert response.status_code == status.HTTP_200_OK
            assert len(rps := response.json()) == query.count()
            assert set([x["id"] for x in rps]) == set(list(query.values_list("id", flat=True)))

        else:
            query = RevenueProgram.objects.filtered_by_role_assignment(user.roleassignment)
            spy = mocker.spy(RevenueProgramManager, "filtered_by_role_assignment")
            unpermitted = RevenueProgram.objects.exclude(id__in=query.values_list("id", flat=True))
            assert query.count()
            assert unpermitted.count()
            response = client.get(reverse("revenue-program-list"))
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
    def test_list_when_unexpected_user(self, user, client, mocker):
        """Show that unexpected users cannot retrieve any revenue programs."""
        RevenueProgramFactory.create_batch(size=2)
        client.force_authenticate(user)
        response = client.get(reverse("revenue-program-list"))
        # if unauthed, get 401
        if not user:
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
        # if unexpected role assignment role type
        else:
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete(self):
        pass

    def test_put(self):
        pass

    def test_patch_when_expected_user(self):
        pass

    def test_patch_when_unexpected_user(self):
        pass

    # def test_pagination_disabled(self):
    #     response = self.assert_superuser_can_get(self.list_url)
    #     self.assertNotIn("count", response.json())
    #     self.assertNotIn("results", response.json())

    # # this should be a test on serializer
    # # def test_tax_id_available_in_response(self):
    # #     response = self.assert_superuser_can_get(self.detail_url)
    # #     assert "tax_id" in response.json()

    # def test_allowed_users_can_update_tax_id(self):
    #     tax_id = "111111111"
    #     allowed_users = [self.superuser, self.org_user]
    #     for user in allowed_users:
    #         json_response = self.assert_user_can_patch(self.detail_url, user, {"tax_id": tax_id}).json()
    #         assert "tax_id" in json_response
    #         assert tax_id == json_response["tax_id"]
    #         assert "id" in json_response
    #         assert "name" in json_response
    #         assert "slug" in json_response

    # def test_user_cannot_patch_other_fields(self):
    #     new_value = "new name"
    #     response = self.assert_superuser_can_patch(self.detail_url, {"name": new_value})
    #     assert response.json()["name"] != new_value

    # def test_patch_tax_id_validates_length(self):
    #     user = user_model.objects.create_superuser(email="test_superuser@test.com", password="testing")
    #     self.client.force_authenticate(user=user)
    #     invalid_tax_id = "123"
    #     response = self.client.patch(self.detail_url, {"tax_id": invalid_tax_id}, format="json")
    #     assert response.status_code == status.HTTP_400_BAD_REQUEST
    #     assert response.json() == {"tax_id": ["Ensure this field has at least 9 characters."]}


@pytest.mark.django_db
@pytest.fixture
def org():
    return OrganizationFactory()


@pytest.mark.django_db
@pytest.fixture
def rp(org):
    return RevenueProgramFactory(organization=org)


@pytest.mark.django_db
@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
@pytest.mark.django_db
def rp_role_assignment(user, rp):
    ra = RoleAssignmentFactory(user=user, role_type=Roles.RP_ADMIN, organization=rp.organization)
    ra.revenue_programs.add(rp)
    ra.save()
    return ra


class FakeStripeProduct:
    def __init__(self, id):
        self.id = id


@pytest.mark.django_db
class TestHandleStripeAccountLink:
    def test_happy_path_when_stripe_already_verified_on_payment_provider(self, rp_role_assignment):
        rp = rp_role_assignment.revenue_programs.first()
        rp.payment_provider.stripe_verified = True
        rp.payment_provider.stripe_product_id = "something"
        rp.payment_provider.save()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"requiresVerification": False}

    def test_happy_path_when_stripe_account_not_yet_created(self, monkeypatch, rp_role_assignment):
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
        rp = rp_role_assignment.revenue_programs.first()
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.stripe_account_id = None
        rp.payment_provider.stripe_product_id = None
        rp.payment_provider.save()
        pp_count = Version.objects.get_for_object(rp.payment_provider).count()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
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

    def test_happy_path_when_stripe_account_already_created_and_past_due_reqs(self, monkeypatch, rp_role_assignment):
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
        rp = rp_role_assignment.revenue_programs.first()
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.stripe_account_id = stripe_account_id
        rp.payment_provider.stripe_product_id = "something"
        rp.payment_provider.save()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {
            "requiresVerification": True,
            "reason": "past_due",
            "url": stripe_url,
            "stripeConnectStarted": True,
        }

    def test_happy_path_when_stripe_account_already_created_and_pending_verification(
        self, monkeypatch, rp_role_assignment
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
        rp = rp_role_assignment.revenue_programs.first()
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.stripe_account_id = stripe_account_id
        rp.payment_provider.stripe_product_id = "something"
        rp.payment_provider.save()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {
            "requiresVerification": True,
            "reason": "pending_verification",
            "stripeConnectStarted": True,
        }

    def test_happy_path_when_stripe_account_newly_has_charges_enabled(self, rp_role_assignment, monkeypatch):
        stripe_account_id = "fakeId"
        mock_stripe_account_retrieve = mock.MagicMock(
            return_value={
                "charges_enabled": True,
                "id": stripe_account_id,
                "details_submitted": True,
            }
        )
        monkeypatch.setattr("stripe.Account.retrieve", mock_stripe_account_retrieve)
        rp = rp_role_assignment.revenue_programs.first()
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.stripe_account_id = stripe_account_id
        rp.payment_provider.stripe_product_id = "something"
        rp.payment_provider.save()
        pp_version_count = Version.objects.get_for_object(rp.payment_provider).count()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"requiresVerification": False}
        rp.payment_provider.refresh_from_db()
        assert rp.payment_provider.stripe_verified is True
        assert Version.objects.get_for_object(rp.payment_provider).count() == pp_version_count + 1

    def test_when_unauthenticated(self, rp):
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        client = APIClient()
        response = client.post(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_when_no_role_assignment(self, rp, user):
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_when_rp_not_found(self, rp_role_assignment):
        rp = rp_role_assignment.revenue_programs.first()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        rp.delete()
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_when_dont_have_access_to_rp(self, rp_role_assignment):
        unowned_rp = RevenueProgramFactory()
        assert unowned_rp not in rp_role_assignment.revenue_programs.all()
        url = reverse("handle-stripe-account-link", args=(unowned_rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_when_no_payment_provider(self, rp_role_assignment):
        (rp := rp_role_assignment.revenue_programs.first()).payment_provider.delete()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_when_stripe_error_on_account_creation(self, rp_role_assignment, monkeypatch):
        mock_fn = mock.MagicMock()
        mock_fn.side_effect = StripeError("Stripe blew up")
        monkeypatch.setattr("stripe.Account.create", mock_fn)
        rp = rp_role_assignment.revenue_programs.first()
        rp.payment_provider.stripe_account_id = None
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.stripe_product_id = None
        rp.payment_provider.save()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_when_stripe_error_on_account_retrieval(self, rp_role_assignment, monkeypatch):
        mock_fn = mock.MagicMock()
        mock_fn.side_effect = StripeError("Stripe blew up")
        monkeypatch.setattr("stripe.Account.retrieve", mock_fn)
        rp = rp_role_assignment.revenue_programs.first()
        rp.payment_provider.stripe_account_id = "someId"
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.save()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_when_stripe_error_on_stripe_product_creation(self, rp_role_assignment, monkeypatch):
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
        rp = rp_role_assignment.revenue_programs.first()
        rp.payment_provider.stripe_account_id = None
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.stripe_product_id = None
        rp.payment_provider.save()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_when_stripe_error_on_account_link_creation(self, rp_role_assignment, monkeypatch):
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
        rp = rp_role_assignment.revenue_programs.first()
        rp.payment_provider.stripe_account_id = stripe_account_id
        rp.payment_provider.stripe_verified = False
        rp.payment_provider.stripe_product_id = "something"
        rp.payment_provider.save()
        url = reverse("handle-stripe-account-link", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
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
