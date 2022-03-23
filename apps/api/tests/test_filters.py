from django.conf import settings
from django.db.models import Q
from django.db.models.query import QuerySet

from rest_framework.reverse import reverse
from rest_framework.test import APIRequestFactory

from apps.api.filters import RoleAssignmentFilterBackend
from apps.api.permissions import ALL_ACCESSOR
from apps.common.tests.test_resources import AbstractTestCase
from apps.common.utils import reduce_queryset_with_filters
from apps.organizations.models import RevenueProgram
from apps.pages.models import DonationPage
from apps.pages.views import PageViewSet
from apps.users.models import Roles
from apps.users.tests.utils import create_test_user


class RoleAssignmentFilterBackendTest(AbstractTestCase):
    def setUp(self):
        super().setUp()
        self.page_view = PageViewSet
        self.set_up_domain_model()
        self.donation_pages = DonationPage.objects.all()
        self.rp_user_with_two_rps = create_test_user(
            role_assignment_data={
                "role_type": Roles.RP_ADMIN,
                "organization": self.org1,
                "revenue_programs": [self.org1_rp1, self.org1_rp2],
            }
        )

    def _create_page_request_for_user(self, user, org_slug=None, rp_slug=None):
        request_factory = APIRequestFactory()
        query_params = {}
        if org_slug:
            query_params[settings.ORG_SLUG_PARAM] = org_slug
        if rp_slug:
            query_params[settings.RP_SLUG_PARAM] = rp_slug
        request = request_factory.get(reverse("contributions-list"), query_params)
        request.user = user
        request.sessions = {}
        return request

    def _use_filter_backend(self, request):
        filter_backend = RoleAssignmentFilterBackend()
        return filter_backend.filter_queryset(request, self.donation_pages, self.page_view)

    def do_filter(self, user, **request_kwargs):
        request = self._create_page_request_for_user(user, **request_kwargs)
        return self._use_filter_backend(request)

    def assert_correct_org(self, filtered, org):
        distinct_orgs = filtered.values_list("revenue_program__organization", flat=True).distinct()
        self.assertEqual(len(distinct_orgs), 1)
        self.assertEqual(distinct_orgs[0], org.pk)

    def assert_correct_rp(self, filtered, rp):
        distinct_rps = filtered.order_by("revenue_program").values_list("revenue_program", flat=True).distinct()
        self.assertEqual(len(distinct_rps), 1)
        self.assertEqual(distinct_rps[0], rp.pk)

    def assert_correct_rp_set(self, filtered, rps):
        distinct_rps = filtered.values_list("revenue_program", flat=True).distinct()
        expected_rps = [rp.pk for rp in rps]
        self.assertEqual(set(distinct_rps), set(expected_rps))

    def assert_expected_pages(self, filtered, org=None, rps=None):
        filters = []
        if org:
            filters.append(Q(revenue_program__organization=org))
        if rps and type(rps) == QuerySet:
            filters.append(Q(revenue_program__in=rps))
        elif rps:
            filters.append(Q(revenue_program=rps))
        target_pages = reduce_queryset_with_filters(self.donation_pages, filters)
        self.assertEqual(set(filtered.values_list("pk", flat=True)), set(target_pages.values_list("pk", flat=True)))

    def test_hub_admin_without_slugs(self):
        """
        Hub admins, without filtering on org slug or rp slug, should see everything.
        """
        filtered = self.do_filter(self.hub_user)

        # We expect there to the same number of objects filtered as ther are total...
        self.assertEqual(len(self.donation_pages), len(filtered))
        # ...and we expect them to be the same objects
        self.assertEqual(set(self.donation_pages), set(filtered))

    def test_hub_admin_with_org_slug(self):
        """
        Hub admins may sort their resources by Organization.
        """
        filtered = self.do_filter(self.hub_user, org_slug=self.org1.slug)
        self.assert_correct_org(filtered, self.org1)
        self.assert_expected_pages(filtered, self.org1)

    def test_hub_admin_with_rp_slug(self):
        """
        Hub admins may sort their resources by RevenueProgram.
        """
        filtered = self.do_filter(self.hub_user, rp_slug=self.org1_rp1.slug)
        self.assert_correct_rp(filtered, self.org1_rp1)
        self.assert_expected_pages(filtered, rps=self.org1_rp1)

    def test_hub_admin_with_both_slugs(self):
        filtered = self.do_filter(self.hub_user, org_slug=self.org1.slug, rp_slug=self.org1_rp1.slug)
        self.assert_correct_rp(filtered, self.org1_rp1)
        self.assert_expected_pages(filtered, rps=self.org1_rp1)

    def test_hub_admin_with_explicit_all_orgs(self):
        """
        Hub Admins can select "All" Organizations.
        """
        filtered = self.do_filter(self.hub_user, org_slug=ALL_ACCESSOR)

        self.assertEqual(len(self.donation_pages), len(filtered))
        self.assertEqual(set(self.donation_pages), set(filtered))

    def test_hub_admin_with_explicit_all_rps(self):
        """
        Hub Admins can select "All" for Revenue Programs.
        """
        target_org = self.orgs[0]
        filtered = self.do_filter(self.hub_user, org_slug=target_org.slug, rp_slug=ALL_ACCESSOR)

        self.assert_correct_org(filtered, target_org)
        expected_pages = self.donation_pages.filter(revenue_program__in=target_org.revenueprogram_set.all())

        self.assertEqual(
            list(expected_pages.values_list("pk", flat=True)).sort(), list(filtered.values_list("pk", flat=True)).sort()
        )

    def test_org_admin_without_slugs(self):
        filtered = self.do_filter(self.org_user)
        self.assert_correct_org(filtered, self.org1)
        self.assert_expected_pages(filtered, rps=self.org1.revenueprogram_set.all())

    def test_org_admin_with_org_slug(self):
        filtered = self.do_filter(self.org_user, org_slug=self.org1.slug)
        self.assert_correct_org(filtered, self.org1)
        self.assert_expected_pages(filtered, rps=self.org1.revenueprogram_set.all())

    def test_org_admin_with_org_slug_when_perm_mismatch(self):
        """
        Assigning an Org Admin to an org, but requesting another org_slug should not
        bypass the role_assignment. It should not return resources by org_slug
        """
        mismatch_filtered = self.do_filter(self.org_user, org_slug=self.org2.slug)
        properly_filtered = self.do_filter(self.org_user, org_slug=self.org1.slug)

        # The mismatch should result in an empty queryset
        self.assertFalse(mismatch_filtered.exists())
        # Whereas the non-mismatched filter should result in a queryset
        self.assertTrue(properly_filtered.exists())

    def test_org_admin_with_rp_slug(self):
        filtered = self.do_filter(self.org_user, rp_slug=self.org1_rp1.slug)
        self.assert_correct_org(filtered, self.org1)
        self.assert_correct_rp(filtered, self.org1_rp1)
        self.assert_expected_pages(filtered, rps=self.org1_rp1)

    def test_org_admin_with_rp_slug_when_perm_mismatch(self):
        """
        Assigning an Org Admin to an Org, but requesting a queryset filtered by an
        rp_slug that does not belong to that Org should result in an empty queryset.
        """
        mismatch_filtered = self.do_filter(self.org_user, rp_slug=self.org2_rp.slug)
        # The mismatch should result in an empty queryset
        self.assertFalse(mismatch_filtered.exists())

    def test_org_admin_with_rp_slug_when_org_mismatch(self):
        """
        Providing an org_slug and a revenue_program slug that does not belong
        to that org should result in an empty queryset
        """
        bad_filtered = self.do_filter(self.org_user, org_slug=self.org1.slug, rp_slug=self.org2_rp.slug)
        self.assertFalse(bad_filtered.exists())

    def test_org_admin_with_both_slugs(self):
        filtered = self.do_filter(self.org_user, org_slug=self.org1.slug, rp_slug=self.org1_rp1.slug)
        self.assert_correct_org(filtered, self.org1)
        self.assert_correct_rp(filtered, self.org1_rp1)
        self.assert_expected_pages(filtered, rps=self.org1_rp1)

    def test_org_admin_when_orgs_all(self):
        """
        Org Admins trying to request "all" orgs should only get resources back for their assigned Org.
        """
        filtered = self.do_filter(self.org_user, org_slug=ALL_ACCESSOR)
        self.assert_correct_org(filtered, self.org1)

    def test_rp_admin_without_slugs(self):
        filtered = self.do_filter(self.rp_user_with_two_rps)
        self.assert_correct_org(filtered, self.org1)
        self.assert_correct_rp_set(filtered, self.rp_user_with_two_rps.roleassignment.revenue_programs.all())

    def test_rp_admin_with_rp_slug(self):
        filtered = self.do_filter(self.rp_user_with_two_rps, rp_slug=self.org1_rp1.slug)
        self.assert_correct_org(filtered, self.org1)
        self.assert_correct_rp(filtered, self.org1_rp1)

    def test_rp_admin_with_rp_slug_when_rp_not_in_role(self):
        """
        RP Admins selecting valid but mismatched org and rp slugs
        (rp does not belong to org) should see an empty queryset
        """
        not_mine_query = RevenueProgram.objects.filter(organization=self.org2).exclude(
            roleassignment__user=self.rp_user
        )
        self.assertTrue(not_mine_query.exists())

        filtered = self.do_filter(self.rp_user, rp_slug=not_mine_query.first().slug)
        self.assertFalse(filtered.exists())

    def test_rp_admin_with_both_slugs(self):
        filtered = self.do_filter(self.rp_user, org_slug=self.org1.slug, rp_slug=self.org1_rp1.slug)
        self.assert_correct_org(filtered, self.org1)
        self.assert_correct_rp_set(filtered, [self.org1_rp1])

    def test_rp_admin_with_both_slugs_when_mismatched(self):
        """
        RP Admins selecting a revenue program that does not belong to their org should see an empty queryset
        """
        filtered = self.do_filter(self.rp_user, rp_slug=self.org2_rp)
        self.assertFalse(filtered.exists())
