from django.contrib.auth import get_user_model

import pytest
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from apps.api.tests import RevEngineApiAbstractTestCase
from apps.organizations.models import Feature, Organization, Plan, RevenueProgram, Roles
from apps.organizations.tests.factories import (
    FeatureFactory,
    OrganizationFactory,
    RevenueProgramFactory,
)
from apps.users.tests.factories import RoleAssignmentFactory, UserFactory, create_test_user


user_model = get_user_model()


class OrganizationViewSetTest(RevEngineApiAbstractTestCase):
    model_factory = OrganizationFactory
    model = Organization

    def setUp(self):
        super().setUp()
        self.is_authed_user = create_test_user()
        self.post_data = {}
        self.expected_user_types = (
            self.superuser,
            self.hub_user,
            self.org_user,
            self.rp_user,
        )
        self.detail_url = reverse("organization-detail", args=(self.org1.pk,))
        self.list_url = reverse("organization-list")

    def assert_user_can_retrieve_an_org(self, user):
        response = self.assert_user_can_get(self.detail_url, user)
        self.assertEqual(response.json()["id"], self.org1.pk)

    def assert_user_cannot_udpate_an_org(self, user):
        last_modified = self.org1.modified
        self.assert_user_cannot_patch_because_not_implemented(self.detail_url, user)
        self.org1.refresh_from_db()
        self.assertEqual(last_modified, self.org1.modified)

    def assert_user_cannot_create_an_org(self, user):
        before_count = Organization.objects.count()
        self.assert_user_cannot_post_because_not_implemented(self.list_url, user)
        self.assertEqual(before_count, Organization.objects.count())

    def assert_user_cannot_delete_an_org(self, user):
        self.assertGreaterEqual(before_count := Organization.objects.count(), 1)
        self.assert_user_cannot_delete_because_not_implemented(self.detail_url, user)
        self.assertEqual(before_count, Organization.objects.count())

    def test_unauthed_cannot_access(self):
        self.assert_unauthed_cannot_get(self.detail_url)
        self.assert_unauthed_cannot_get(self.list_url)
        self.assert_unauthed_cannot_delete(self.detail_url)
        self.assert_unauthed_cannot_patch(self.detail_url)
        self.assert_unauthed_cannot_put(self.detail_url)

    def test_expected_user_types_can_only_read(self):
        for user in self.expected_user_types:
            self.assert_user_can_retrieve_an_org(user)
            self.assert_user_cannot_create_an_org(user)
            self.assert_user_cannot_udpate_an_org(user)
            self.assert_user_cannot_delete_an_org(user)
        for user, count in [
            (self.superuser, Organization.objects.count()),
            (self.hub_user, Organization.objects.count()),
            (self.org_user, 1),
            (self.rp_user, 1),
        ]:
            self.assert_user_can_list(self.list_url, user, count, results_are_flat=True)

    def test_unexpected_role_type(self):
        novel = create_test_user(role_assignment_data={"role_type": "this-is-new"})
        self.assert_user_cannot_get(
            reverse("organization-list"),
            novel,
            expected_status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class RevenueProgramViewSetTest(RevEngineApiAbstractTestCase):
    def setUp(self):
        super().setUp()
        self.list_url = reverse("revenue-program-list")
        self.detail_url = reverse("revenue-program-detail", args=(RevenueProgram.objects.first().pk,))

    def test_superuser_can_retrieve_an_rp(self):
        return self.assert_superuser_can_get(self.detail_url)

    def test_superuser_can_list_rps(self):
        expected_count = RevenueProgram.objects.count()
        return self.assert_superuser_can_list(self.list_url, expected_count, results_are_flat=True)

    def test_other_cannot_access_resource(self):
        non_superusers = [self.hub_user, self.org_user, self.rp_user, self.contributor_user]
        for user in non_superusers:
            self.assert_user_cannot_get(self.detail_url, user)
            self.assert_user_cannot_get(self.list_url, user)
            self.assert_user_cannot_post(self.list_url, user)
            self.assert_user_cannot_patch(self.detail_url, user)
            self.assert_user_cannot_delete(self.detail_url, user)

    def test_unauthed_cannot_access(self):
        self.assert_unauthed_cannot_get(self.detail_url)
        self.assert_unauthed_cannot_get(self.list_url)
        self.assert_unauthed_cannot_delete(self.detail_url)
        self.assert_unauthed_cannot_patch(self.detail_url)
        self.assert_unauthed_cannot_put(self.detail_url)

    def test_pagination_disabled(self):
        response = self.assert_superuser_can_get(self.list_url)
        self.assertNotIn("count", response.json())
        self.assertNotIn("results", response.json())


class PlanViewSetTest(RevEngineApiAbstractTestCase):
    def setUp(self):
        super().setUp()
        self.list_url = reverse("plan-list")
        self.detail_url = reverse("plan-detail", args=(Plan.objects.first(),))

    ########
    # Create

    def test_no_one_can_create(self):
        for user, status_code in [
            (self.superuser, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.hub_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.org_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.rp_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.contributor_user, status.HTTP_403_FORBIDDEN),
            (self.generic_user, status.HTTP_405_METHOD_NOT_ALLOWED),
        ]:
            self.assert_user_cannot_post(self.list_url, user, {}, status_code)

    #################
    # Read - Retrieve

    def test_superuser_can_retrieve_a_plan(self):
        self.assert_superuser_can_get(reverse("plan-detail", args=(Plan.objects.first().pk,)))

    def test_hub_user_can_retrieve_a_plan(self):
        self.assert_hub_admin_can_get(reverse("plan-detail", args=(Plan.objects.first().pk,)))

    def test_org_admin_can_retrieve_their_orgs_plan(self):
        self.assert_hub_admin_can_get(reverse("plan-detail", args=(Plan.objects.first().pk,)))
        self.assertGreater(expected_count := Plan.objects.count(), 1)
        self.assert_hub_admin_can_list(self.list_url, expected_count, results_are_flat=True)

    def test_org_admin_cannot_retrieve_another_orgs_plan(self):
        detail_url = reverse("plan-detail", args=(self.org2.plan.pk,))
        self.assert_rp_user_cannot_get(detail_url)

    def test_rp_user_can_retrieve_their_orgs_plan(self):
        detail_url = reverse("plan-detail", args=(self.org1.plan.pk,))
        self.assert_rp_user_can_get(detail_url)

    def test_rp_user_cannot_retrieve_another_orgs_plan(self):
        detail_url = reverse("plan-detail", args=(self.org2.plan.pk,))
        self.assert_rp_user_cannot_get(detail_url)

    #############
    # Read - List

    def test_superuser_can_list_plans(self):
        self.assertGreater(expected_count := Plan.objects.count(), 1)
        self.assert_superuser_can_list(self.list_url, expected_count, results_are_flat=True)

    def test_hub_admin_can_list_plans(self):
        self.assertGreater(expected_count := Plan.objects.count(), 1)
        self.assert_hub_admin_can_list(self.list_url, expected_count, results_are_flat=True)

    def test_org_admin_sees_their_plan_in_list(self):
        self.assert_org_admin_can_list(
            self.list_url, 1, assert_item=lambda x: x["id"] == self.org1.plan.pk, results_are_flat=True
        )

    def test_rp_user_sees_their_orgs_plan_in_list(self):
        self.assert_rp_user_can_list(
            self.list_url,
            1,
            assert_item=lambda x: x["id"] == self.rp_user.roleassignment.organization.plan.pk,
            results_are_flat=True,
        )

    ########
    # Update

    def test_no_one_can_update(self):
        for user, status_code in [
            (self.superuser, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.hub_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.org_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.rp_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.contributor_user, status.HTTP_403_FORBIDDEN),
            (self.generic_user, status.HTTP_405_METHOD_NOT_ALLOWED),
        ]:
            self.assert_user_cannot_patch(self.detail_url, user, {}, expected_status_code=status_code)

    ########
    # Delete

    def test_no_one_can_delete(self):
        for user, status_code in [
            (self.superuser, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.hub_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.org_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.rp_user, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.contributor_user, status.HTTP_403_FORBIDDEN),
            (self.generic_user, status.HTTP_405_METHOD_NOT_ALLOWED),
        ]:
            self.assert_user_cannot_delete(self.detail_url, user, expected_status_code=status_code)


class FeatureViewSetTest(RevEngineApiAbstractTestCase):
    def setUp(self):
        super().setUp()
        self.org1.plan.features.add(FeatureFactory())
        self.org2.plan.features.add(FeatureFactory())

    ########
    # Create

    def test_no_one_can_create(self):
        for user, status_code in [
            (self.superuser, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.hub_user, status.HTTP_403_FORBIDDEN),
            (self.org_user, status.HTTP_403_FORBIDDEN),
            (self.rp_user, status.HTTP_403_FORBIDDEN),
            (self.contributor_user, status.HTTP_403_FORBIDDEN),
            (self.generic_user, status.HTTP_403_FORBIDDEN),
        ]:
            self.assert_user_cannot_post(reverse("feature-list"), user, {}, status_code)

    #################
    # Read - Retrieve

    def test_superuser_can_retrieve_a_feature(self):
        self.assert_superuser_can_get(reverse("feature-detail", args=(Feature.objects.first().pk,)))

    def test_non_superuser_users_cannot_retrieve_a_feature(self):
        for user in [
            self.hub_user,
            self.org_user,
            self.rp_user,
            self.contributor_user,
            self.generic_user,
        ]:
            self.assert_user_cannot_get(
                reverse("feature-detail", args=(Feature.objects.first().pk,)), user, status.HTTP_403_FORBIDDEN
            )

    #############
    # Read - List

    def test_superuser_can_list_features(self):
        self.assert_superuser_can_list(reverse("feature-list"), Feature.objects.count(), results_are_flat=True)

    def test_non_superuser_users_cannot_list_features(self):
        for user in [
            self.hub_user,
            self.org_user,
            self.rp_user,
            self.contributor_user,
            self.generic_user,
        ]:
            self.assert_user_cannot_get(reverse("feature-list"), user, status.HTTP_403_FORBIDDEN)

    ########
    # Update

    def test_no_one_can_update(self):
        for user, status_code in [
            (self.superuser, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.hub_user, status.HTTP_403_FORBIDDEN),
            (self.org_user, status.HTTP_403_FORBIDDEN),
            (self.rp_user, status.HTTP_403_FORBIDDEN),
            (self.contributor_user, status.HTTP_403_FORBIDDEN),
            (self.generic_user, status.HTTP_403_FORBIDDEN),
        ]:
            self.assert_user_cannot_patch(
                reverse("feature-detail", args=(self.org1.plan.features.first().pk,)),
                user,
                {},
                expected_status_code=status_code,
            )

    ########
    # Delete

    def test_no_one_can_delete(self):
        for user, status_code in [
            (self.superuser, status.HTTP_405_METHOD_NOT_ALLOWED),
            (self.hub_user, status.HTTP_403_FORBIDDEN),
            (self.org_user, status.HTTP_403_FORBIDDEN),
            (self.rp_user, status.HTTP_403_FORBIDDEN),
            (self.contributor_user, status.HTTP_403_FORBIDDEN),
            (self.generic_user, status.HTTP_403_FORBIDDEN),
        ]:
            self.assert_user_cannot_delete(
                reverse("feature-detail", args=(self.org1.plan.features.first().pk,)),
                user,
                expected_status_code=status_code,
            )


@pytest.mark.django_db
@pytest.mark.fixture
def org(self):
    return OrganizationFactory()


@pytest.mark.django_db
@pytest.mark.fixture
def rp(self, org):
    return RevenueProgramFactory(organization=org)


@pytest.mark.django_db
@pytest.mark.fixture
def user(self):
    return UserFactory()


@pytest.mark.django_db
@pytest.mark.fixture
def rp_role_assignment(self, user, rp):
    return RoleAssignmentFactory(
        user=user, role_type=Roles.RP_ADMIN, organization=rp.organization, revenue_programs=[rp]
    )


class TestCreateStripeAccount:
    def test_happy_path(self, rp_role_assignment, monkeypatch, mocker):
        # mocker.spy()
        monkeypatch.setattr(
            "stripe.Account.create",
        )
        assert (rp := rp_role_assignment.revenue_programs.first()).stripe_account_id is None
        url = reverse("create-stripe-account", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_201_CREATED
        rp.refresh_from_db()
        assert rp.stripe_account_id == ""

    def test_when_unauthenticated(self, rp):
        url = reverse("create-stripe-account", args=(rp.pk,))
        client = APIClient()
        response = client.post(url)
        assert response.status_code == status.HTTP_403

    def test_when_no_role_assignment(self, user, rp):
        url = reverse("create-stripe-account", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_when_rp_not_found(self, rp_role_assignment):
        url = reverse("create-stripe-account", args=(rp.pk,))
        rp_role_assignment.revenue_programs.first().delete()
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_when_dont_have_access_to_rp(self, rp_role_assignment):
        unowned_rp = RevenueProgramFactory()
        assert unowned_rp not in rp_role_assignment.revenue_programs.all()
        url = reverse("create-stripe-account", args=(unowned_rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_when_no_payment_provider(self, rp_role_assignment):
        (rp := rp_role_assignment.revenue_programs.first()).payment_provider = None
        rp.save()
        url = reverse("create-stripe-account", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_when_payment_provider_already_has_stripe_account_id(self, rp_role_assignment):
        (rp := rp_role_assignment.revenue_programs.first()).payment_provider.stripe_verified = True
        rp.payment_provider.save()
        url = reverse("create-stripe-account", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_409_CONFLICT

    # mock stripe call to raise error
    def test_when_stripe_error(self):
        (rp := rp_role_assignment.revenue_programs.first()).payment_provider = None
        rp.save()
        url = reverse("create-stripe-account", args=(rp.pk,))
        client = APIClient()
        client.force_authenticate(user=rp_role_assignment.user)
        response = client.post(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


class TestCreateStripeAccountLink:
    def test_happy_path(self, rp):
        pass

    def test_when_unauthenticated(self):
        pass

    def test_when_rp_not_found(self):
        pass

    def test_when_no_role_assignment(self):
        pass

    def test_when_dont_have_access_to_rp(self):
        pass

    def test_when_no_payment_provider(self):
        pass

    def test_when_payment_provider_has_no_stripe_account_id(self):
        pass

    def test_when_stripe_error(self):
        pass


class TestCreateStripeAccountLinkComplete:
    def test_happy_path(self):
        pass

    def test_when_unauthenticated(self):
        pass

    def test_when_rp_not_found(self):
        pass

    def test_when_no_role_assignment(self):
        pass

    def test_when_dont_have_access_to_rp(self):
        pass

    def test_when_no_payment_provider(self):
        pass

    def test_when_payment_provider_already_stripe_verified(self):
        pass

    def test_when_stripe_error(self):
        pass
