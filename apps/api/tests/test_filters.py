from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.db.models.query import QuerySet

from rest_framework.reverse import reverse
from rest_framework.test import APIRequestFactory, APITestCase

from apps.api.filters import RoleAssignmentFilterBackend
from apps.api.permissions import ALL_ACCESSOR
from apps.common.utils import reduce_queryset_with_filters
from apps.organizations.tests.factories import OrganizationFactory, RevenueProgramFactory
from apps.pages.models import DonationPage
from apps.pages.tests.factories import DonationPageFactory
from apps.pages.views import PageViewSet
from apps.users.models import RoleAssignment, Roles


class RoleAssignmentFilterBackendTest(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()

        orgs_num = 2
        self.orgs = []
        rps_num = 2
        self.rps = []
        pages_num = 2
        self.pages = []

        self.page_view = PageViewSet
        self.page_view_url = reverse("donationpage-list")

        for _ in range(orgs_num):
            org = OrganizationFactory()
            self.orgs.append(org)

            for _ in range(rps_num):
                rp = RevenueProgramFactory(organization=org)
                self.rps.append(rp)

                for _ in range(pages_num):
                    self.pages.append(DonationPageFactory(revenue_program=rp))

        self.page_queryset = DonationPage.objects.all()

    def _create_user_with_role(self, role_type=None, organization=None, revenue_programs=None):
        user = self.user_model.objects.create_user(email="testuser@test.com", password="testpassword")
        role_assignment = RoleAssignment(user=user, role_type=role_type)
        if organization:
            role_assignment.organization = organization
        role_assignment.save()
        if revenue_programs:
            role_assignment.revenue_programs.set(revenue_programs)
        return user

    def _create_page_request_for_user(self, user, org_slug=None, rp_slug=None):
        request_factory = APIRequestFactory()
        query_params = {}
        if org_slug:
            query_params[settings.ORG_SLUG_PARAM] = org_slug
        if rp_slug:
            query_params[settings.RP_SLUG_PARAM] = rp_slug
        request = request_factory.get(self.page_view_url, query_params)
        request.user = user
        request.sessions = {}
        return request

    def _use_filter_backend(self, request):
        filter_backend = RoleAssignmentFilterBackend()
        return filter_backend.filter_queryset(request, self.page_queryset, self.page_view)

    def do_filter(self, user=None, role_type=None, **request_kwargs):
        if not user:
            user = self._create_user_with_role(role_type=role_type)
        request = self._create_page_request_for_user(user, **request_kwargs)
        return self._use_filter_backend(request)

    def assert_correct_org(self, filtered, org):
        distinct_orgs = filtered.values_list("revenue_program__organization", flat=True).distinct()
        self.assertEqual(len(distinct_orgs), 1)
        self.assertEqual(distinct_orgs[0], org.pk)

    def assert_correct_rp(self, filtered, rp):
        distinct_rps = filtered.values_list("revenue_program", flat=True).distinct()
        self.assertEqual(len(distinct_rps), 1)
        self.assertEqual(distinct_rps[0], rp.pk)

    def assert_correct_rp_set(self, filtered, rps):
        distinct_rps = filtered.values_list("revenue_program", flat=True).distinct()
        expected_rps = [rp.pk for rp in rps]
        self.assertEqual(list(distinct_rps).sort(), expected_rps.sort())

    def assert_expected_pages(self, filtered, org=None, rps=None):
        filters = []
        if org:
            filters.append(Q(revenue_program__organization=org))
        if rps and type(rps) == QuerySet:
            filters.append(Q(revenue_program__in=rps))
        elif rps:
            filters.append(Q(revenue_program=rps))
        target_pages = reduce_queryset_with_filters(self.page_queryset, filters)
        self.assertEqual(list(filtered.values_list("pk", flat=True)), list(target_pages.values_list("pk", flat=True)))

    def test_hub_admin_without_slugs(self):
        """
        Hub admins, without filtering on org slug or rp slug, should see everything.
        """
        filtered = self.do_filter(role_type=Roles.HUB_ADMIN)

        # We expect there to the same number of objects filtered as ther are total...
        self.assertEqual(len(self.page_queryset), len(filtered))
        # ...and we expect them to be the same objects
        self.assertEqual(set(self.page_queryset), set(filtered))

    def test_hub_admin_with_org_slug(self):
        """
        Hub admins may sort their resources by Organization.
        """
        target_org = self.orgs[0]
        filtered = self.do_filter(role_type=Roles.HUB_ADMIN, org_slug=target_org.slug)

        self.assert_correct_org(filtered, target_org)
        self.assert_expected_pages(filtered, target_org)

    def test_hub_admin_with_rp_slug(self):
        """
        Hub admins may sort their resources by RevenueProgram.
        """
        target_rp = self.rps[0]
        filtered = self.do_filter(role_type=Roles.HUB_ADMIN, rp_slug=target_rp.slug)

        self.assert_correct_rp(filtered, target_rp)
        self.assert_expected_pages(filtered, rps=target_rp)

    def test_hub_admin_with_both_slugs(self):
        target_rp = self.rps[0]
        target_org = target_rp.organization
        filtered = self.do_filter(role_type=Roles.HUB_ADMIN, org_slug=target_org.slug, rp_slug=target_rp.slug)

        self.assert_correct_rp(filtered, target_rp)
        self.assert_expected_pages(filtered, rps=target_rp)

    def test_hub_admin_with_explicit_all_orgs(self):
        """
        Hub Admins can select "All" Organizations.
        """
        filtered = self.do_filter(role_type=Roles.HUB_ADMIN, org_slug=ALL_ACCESSOR)

        self.assertEqual(len(self.page_queryset), len(filtered))
        self.assertEqual(set(self.page_queryset), set(filtered))

    def test_hub_admin_with_explicit_all_rps(self):
        """
        Hub Admins can select "All" for Revenue Programs.
        """
        target_org = self.orgs[0]
        filtered = self.do_filter(role_type=Roles.HUB_ADMIN, org_slug=target_org.slug, rp_slug=ALL_ACCESSOR)

        self.assert_correct_org(filtered, target_org)
        expected_pages = self.page_queryset.filter(revenue_program__in=target_org.revenueprogram_set.all())

        self.assertEqual(
            list(expected_pages.values_list("pk", flat=True)).sort(), list(filtered.values_list("pk", flat=True)).sort()
        )

    def test_org_admin_without_slugs(self):
        assigned_org = self.orgs[0]
        # Note that we're filtering on org_slug here, we're defining the org this Org Admin belongs to.
        user = self._create_user_with_role(role_type=Roles.ORG_ADMIN, organization=assigned_org)
        filtered = self.do_filter(user=user)

        self.assert_correct_org(filtered, assigned_org)
        self.assert_expected_pages(filtered, rps=assigned_org.revenueprogram_set.all())

    def test_org_admin_with_org_slug(self):
        target_org = self.orgs[0]
        user = self._create_user_with_role(role_type=Roles.ORG_ADMIN, organization=target_org)
        filtered = self.do_filter(user=user, org_slug=target_org.slug)

        self.assert_correct_org(filtered, target_org)
        self.assert_expected_pages(filtered, rps=target_org.revenueprogram_set.all())

    def test_org_admin_with_org_slug_when_perm_mismatch(self):
        """
        Assigning an Org Admin to an org, but requesting another org_slug should not
        bypass the role_assignment. It should not return resources by org_slug
        """
        assigned_org = self.orgs[0]
        mismatched_org = self.orgs[1]
        user = self._create_user_with_role(role_type=Roles.ORG_ADMIN, organization=assigned_org)
        mismatch_filtered = self.do_filter(user=user, org_slug=mismatched_org.slug)
        properly_filtered = self.do_filter(user=user, org_slug=assigned_org.slug)

        # The mismatch should result in an empty queryset
        self.assertFalse(mismatch_filtered.exists())
        # Whereas the non-mismatched filter should result in a queryset
        self.assertTrue(properly_filtered.exists())

    def test_org_admin_with_rp_slug(self):
        target_rp = self.rps[0]
        target_org = target_rp.organization
        user = self._create_user_with_role(role_type=Roles.ORG_ADMIN, organization=target_org)
        filtered = self.do_filter(user=user, rp_slug=target_rp.slug)

        self.assert_correct_org(filtered, target_org)
        self.assert_correct_rp(filtered, target_rp)
        self.assert_expected_pages(filtered, rps=target_rp)

    def test_org_admin_with_rp_slug_when_perm_mismatch(self):
        """
        Assigning an Org Admin to an Org, but requesting a queryset filtered by an
        rp_slug that does not belong to that Org shoudl result in an empty queryset.
        """
        valid_org = self.orgs[0]
        mismatch_org = self.orgs[1]
        target_rp = valid_org.revenueprogram_set.first()
        user = self._create_user_with_role(role_type=Roles.ORG_ADMIN, organization=mismatch_org)
        mismatch_filtered = self.do_filter(user=user, rp_slug=target_rp.slug)

        # The mismatch should result in an empty queryset
        self.assertFalse(mismatch_filtered.exists())

    def test_org_admin_with_rp_slug_when_org_mismatch(self):
        """
        Providing an org_slug and a revenue_program slug that does not belong to that org should result in an empty queryset
        """
        valid_org = self.orgs[0]
        mismatch_org = self.orgs[1]
        bad_rp = mismatch_org.revenueprogram_set.first()
        user = self._create_user_with_role(role_type=Roles.ORG_ADMIN, organization=valid_org)
        bad_filtered = self.do_filter(user=user, org_slug=valid_org.slug, rp_slug=bad_rp.slug)

        self.assertFalse(bad_filtered.exists())

    def test_org_admin_with_both_slugs(self):
        target_rp = self.rps[0]
        target_org = target_rp.organization
        user = self._create_user_with_role(role_type=Roles.ORG_ADMIN, organization=target_org)
        filtered = self.do_filter(user=user, org_slug=target_org.slug, rp_slug=target_rp.slug)

        self.assert_correct_org(filtered, target_org)
        self.assert_correct_rp(filtered, target_rp)

        self.assert_expected_pages(filtered, rps=target_rp)

    def test_org_admin_when_orgs_all(self):
        """
        Org Admins trying to request "all" orgs should only get resources back for their assigned Org.
        """
        target_org = self.orgs[1]
        user = self._create_user_with_role(role_type=Roles.ORG_ADMIN, organization=target_org)
        filtered = self.do_filter(user=user, org_slug=ALL_ACCESSOR)

        self.assert_correct_org(filtered, target_org)

    def test_rp_admin_without_slugs(self):
        target_org = self.orgs[0]
        target_rp_qs = target_org.revenueprogram_set.filter(pk=target_org.revenueprogram_set.first().pk)
        user = self._create_user_with_role(
            role_type=Roles.RP_ADMIN, organization=target_org, revenue_programs=target_rp_qs
        )
        filtered = self.do_filter(user=user)

        self.assert_correct_org(filtered, target_org)
        self.assert_correct_rp_set(filtered, target_rp_qs)

    def test_rp_admin_with_rp_slug(self):
        target_org = self.orgs[0]
        target_rp_qs = target_org.revenueprogram_set.filter(pk=target_org.revenueprogram_set.first().pk)
        target_rp = target_rp_qs.first()
        user = self._create_user_with_role(
            role_type=Roles.RP_ADMIN, organization=target_org, revenue_programs=target_rp_qs
        )
        filtered = self.do_filter(user=user, rp_slug=target_rp.slug)

        self.assert_correct_org(filtered, target_org)
        self.assert_correct_rp(filtered, target_rp)

    def test_rp_admin_with_rp_slug_when_rp_not_in_role(self):
        """
        RP Admins selecting valid but mismatched org and rp slugs (rp does not belong to org) should see an empty queryset
        """
        target_org = self.orgs[0]
        target_rp_qs = target_org.revenueprogram_set.filter(pk=target_org.revenueprogram_set.first().pk)
        bad_rp = target_org.revenueprogram_set.last()
        # For good measure...
        self.assertNotIn(bad_rp, target_rp_qs)

        user = self._create_user_with_role(
            role_type=Roles.RP_ADMIN, organization=target_org, revenue_programs=target_rp_qs
        )
        filtered = self.do_filter(user=user, rp_slug=target_org.revenueprogram_set.last())

        self.assertFalse(filtered.exists())

    def test_rp_admin_with_both_slugs(self):
        target_org = self.orgs[0]
        target_rp_qs = target_org.revenueprogram_set.filter(pk=target_org.revenueprogram_set.first().pk)
        user = self._create_user_with_role(
            role_type=Roles.RP_ADMIN, organization=target_org, revenue_programs=target_rp_qs
        )
        filtered = self.do_filter(user=user, org_slug=target_org.slug, rp_slug=target_rp_qs.first().slug)

        self.assert_correct_org(filtered, target_org)
        self.assert_correct_rp_set(filtered, target_rp_qs)

    def test_rp_admin_with_both_slugs_when_mismatched(self):
        """
        RP Admins selecting a revenue program that does not belong to their org should see an empty queryset
        """
        target_org = self.orgs[0]
        some_other_org = self.orgs[1]
        good_rp_qs = target_org.revenueprogram_set.filter(pk=target_org.revenueprogram_set.first().pk)
        good_rp = good_rp_qs.first()
        bad_rp = some_other_org.revenueprogram_set.first()
        user = self._create_user_with_role(
            role_type=Roles.RP_ADMIN, organization=target_org, revenue_programs=good_rp_qs
        )
        bad_filtered = self.do_filter(user=user, rp_slug=bad_rp.slug)
        good_filtered = self.do_filter(user=user, rp_slug=good_rp.slug)

        self.assertFalse(bad_filtered.exists())
        self.assertTrue(good_filtered.exists())
