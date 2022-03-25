import datetime
import json

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone

from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from apps.api.tests import DomainModelBootstrappedTestCase
from apps.common.tests.test_resources import AbstractTestCase
from apps.common.tests.test_utils import get_test_image_file_jpeg
from apps.element_media.tests import setup_sidebar_fixture
from apps.organizations.models import RevenueProgram
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.models import DonationPage, Style, Template
from apps.pages.tests.factories import DonationPageFactory, StyleFactory, TemplateFactory
from apps.pages.validators import required_style_keys


user_model = get_user_model()


class PageViewSetTest(DomainModelBootstrappedTestCase):
    def setUp(self):
        super().setUp()
        self.set_up_domain_model()
        self.default_page_creation_data = {
            "name": "My new page, tho",
            "heading": "New DonationPage",
            "slug": "new-page",
        }

    def assert_created_page_looks_right(
        self,
        created_page,
        expected_org,
        expected_rp,
        creation_data=None,
    ):
        creation_data = creation_data if creation_data is not None else {**self.default_page_creation_data}
        self.assertEqual(created_page.revenue_program.organization, expected_org)
        self.assertEqual(created_page.revenue_program, expected_rp)
        for attr in creation_data.keys():
            self.assertEqual(getattr(created_page, attr), creation_data[attr])

    ########
    # CREATE
    def test_superuser_can_create_a_page(self):
        before_count = DonationPage.objects.count()
        url = f"{reverse('donationpage-list')}?{settings.RP_SLUG_PARAM}={self.org1_rp1.slug}&{settings.ORG_SLUG_PARAM}={self.org1.slug}"
        self.assert_superuser_can_post(url, self.default_page_creation_data)
        self.assertEqual(DonationPage.objects.count(), before_count + 1)
        created_page = DonationPage.objects.get(name=self.default_page_creation_data["name"])
        self.assert_created_page_looks_right(created_page, self.org1, self.org1_rp1)

    def test_hub_user_can_create_a_page(self):
        before_count = DonationPage.objects.count()
        url = f"{reverse('donationpage-list')}?{settings.RP_SLUG_PARAM}={self.org1_rp1.slug}&{settings.ORG_SLUG_PARAM}={self.org1.slug}"
        self.assert_hub_admin_can_post(url, self.default_page_creation_data)
        self.assertEqual(DonationPage.objects.count(), before_count + 1)
        created_page = DonationPage.objects.get(name=self.default_page_creation_data["name"])
        self.assert_created_page_looks_right(created_page, self.org1, self.org1_rp1)

    def test_org_admin_can_create_a_page_for_their_org(self):
        org_pages_query = DonationPage.objects.filter(revenue_program__organization=self.org1)
        before_count = org_pages_query.count()
        url = f"{reverse('donationpage-list')}?{settings.RP_SLUG_PARAM}={self.org1_rp1.slug}&{settings.ORG_SLUG_PARAM}={self.org1.slug}"
        self.assert_org_admin_can_post(url, self.default_page_creation_data)
        self.assertEqual(org_pages_query.count(), before_count + 1)
        created_page = DonationPage.objects.get(name=self.default_page_creation_data["name"])
        self.assert_created_page_looks_right(created_page, self.org1, self.org1_rp1)

    def test_org_admin_cannot_create_a_page_for_another_org(self):
        my_org_pages_query = DonationPage.objects.filter(revenue_program__organization=self.org1)
        other_org_pages_query = DonationPage.objects.filter(revenue_program__organization=self.org2)
        before_my_org_pages_count = my_org_pages_query.count()
        before_other_org_count = other_org_pages_query.count()
        data = {
            "name": "My new page, tho",
            "heading": "New DonationPage",
            "slug": "new-page",
        }
        url = f"{reverse('donationpage-list')}?{settings.RP_SLUG_PARAM}={self.org2_rp.slug}&{settings.ORG_SLUG_PARAM}={self.org2.slug}"
        self.assert_org_admin_cannot_post(url, data)
        self.assertEqual(my_org_pages_query.count(), before_my_org_pages_count)
        self.assertEqual(other_org_pages_query.count(), before_other_org_count)

    def test_rp_admin_can_create_a_page_for_their_rp(self):
        rp = self.rp_user.roleassignment.revenue_programs.first()
        self.assertIsNotNone(rp)
        url = f"{reverse('donationpage-list')}?{settings.RP_SLUG_PARAM}={rp.slug}&{settings.ORG_SLUG_PARAM}={rp.organization.slug}"
        my_rp_pages_query = DonationPage.objects.filter(
            revenue_program__in=self.rp_user.roleassignment.revenue_programs.all()
        )
        before_count = my_rp_pages_query.count()
        response = self.assert_rp_user_can_post(url, self.default_page_creation_data)
        self.assertEqual(my_rp_pages_query.count(), before_count + 1)
        created_page = DonationPage.objects.get(id=response.json()["id"])
        self.assert_created_page_looks_right(created_page, rp.organization, rp)

    # this fails right now: our permissions approach does not handle gating creation for this case
    def test_rp_admin_cannot_create_a_page_for_unowned_rp(self):
        criterion = {
            "revenue_program__in": self.rp_user.roleassignment.revenue_programs.all(),
        }
        my_pages_query = DonationPage.objects.filter(**criterion)
        others_pages_query = DonationPage.objects.exclude(**criterion)
        target_rp = (
            RevenueProgram.objects.filter(organization=self.org1)
            .exclude(id__in=self.rp_user.roleassignment.revenue_programs.values_list("id", flat=True))
            .first()
        )
        self.assertIsNotNone(target_rp)
        self.assertTrue(my_pages_query.exists())
        self.assertTrue(others_pages_query.exists())
        before_my_pages_count = my_pages_query.count()
        before_others_count = others_pages_query.count()
        url = f"{reverse('donationpage-list')}?{settings.RP_SLUG_PARAM}={target_rp.slug}&{settings.ORG_SLUG_PARAM}={self.org1.slug}"
        self.assert_rp_user_cannot_post(url, self.default_page_creation_data)
        self.assertEqual(my_pages_query.count(), before_my_pages_count)
        self.assertEqual(others_pages_query.count(), before_others_count)

    def test_page_create_returns_valdiation_error_when_missing_rp_slug_param(self):
        self.client.force_authenticate(user=self.hub_user)
        url = f"{reverse('donationpage-list')}?{settings.ORG_SLUG_PARAM}={self.org1.slug}"
        response = self.client.post(url, self.default_page_creation_data)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(str(response.data["rp_slug"]), "RevenueProgram.slug is required when creating a new page")

    def test_page_create_returns_valdiation_error_when_bad_rev_slug(self):
        not_real_slug = "not-real"
        url = f"{reverse('donationpage-list')}?{settings.RP_SLUG_PARAM}={not_real_slug}&{settings.ORG_SLUG_PARAM}={self.org1.slug}"
        self.client.force_authenticate(user=self.hub_user)
        response = self.client.post(url, self.default_page_creation_data)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(str(response.data["rp_slug"]), "Could not find revenue program with provided slug")

    def test_page_create_returns_revenue_program_slug(self):
        """
        Page create must return revenue_program in order to navigate the user to the
        correct url for page edit, after creating a page.
        """
        url = f"{reverse('donationpage-list')}?{settings.RP_SLUG_PARAM}={self.org1_rp1.slug}&{settings.ORG_SLUG_PARAM}={self.org1.slug}"
        response = self.assert_hub_admin_can_post(url, self.default_page_creation_data)
        self.assertIn("revenue_program", response.data)
        self.assertIn("slug", response.data["revenue_program"])

    def test_page_create_returns_validation_error_when_violates_unique_constraint(self):
        url = f"{reverse('donationpage-list')}?{settings.RP_SLUG_PARAM}={self.org1_rp1.slug}&{settings.ORG_SLUG_PARAM}={self.org1.slug}"
        response = self.assert_hub_admin_can_post(url, self.default_page_creation_data)
        # make sure first page was created successfully
        self.assertEqual(response.status_code, 201)

        # Then make it again and expect a validation error
        error_response = self.client.post(url, self.default_page_creation_data)
        self.assertEqual(error_response.status_code, 400)
        self.assertIn(settings.RP_SLUG_PARAM, error_response.data)
        self.assertEqual(
            str(error_response.data[settings.RP_SLUG_PARAM]), "This slug is already in use on this Revenue Program"
        )

    ########
    # Update
    def test_superuser_can_update_a_page(self):
        page = DonationPage.objects.filter().first()
        old_page_heading = page.heading
        old_page_pk = page.pk
        detail_url = f"/api/v1/pages/{old_page_pk}/"
        new_heading = old_page_heading[::-1]
        patch_data = {"heading": new_heading}
        self.assert_superuser_can_patch(detail_url, patch_data)
        page.refresh_from_db()
        self.assertEqual(page.pk, old_page_pk)
        self.assertEqual(page.heading, new_heading)

    def test_hub_admin_can_update_a_page(self):
        page = DonationPage.objects.filter().first()
        old_page_heading = page.heading
        old_page_pk = page.pk
        detail_url = f"/api/v1/pages/{old_page_pk}/"
        new_heading = old_page_heading[::-1]
        patch_data = {"heading": new_heading}
        self.assert_hub_admin_can_patch(detail_url, patch_data)
        page.refresh_from_db()
        self.assertEqual(page.pk, old_page_pk)
        self.assertEqual(page.heading, new_heading)

    def test_org_admin_can_update_their_orgs_page(self):
        page = DonationPage.objects.filter(
            revenue_program__organization=self.org_user.roleassignment.organization
        ).first()
        self.assertIsNotNone(page)
        old_page_heading = page.heading
        old_page_pk = page.pk
        detail_url = f"/api/v1/pages/{old_page_pk}/"
        new_heading = old_page_heading[::-1]
        patch_data = {"heading": new_heading}
        self.assert_org_admin_can_patch(detail_url, patch_data)
        page.refresh_from_db()
        self.assertEqual(page.pk, old_page_pk)
        self.assertEqual(page.heading, new_heading)

    def test_org_admin_cannot_update_another_orgs_page(self):
        page = DonationPage.objects.exclude(
            revenue_program__organization=self.org_user.roleassignment.organization
        ).first()
        self.assertIsNotNone(page)
        old_page_heading = page.heading
        old_page_pk = page.pk
        detail_url = f"/api/v1/pages/{old_page_pk}/"
        new_heading = old_page_heading[::-1]
        patch_data = {"heading": new_heading}
        self.assert_org_admin_cannot_patch(detail_url, patch_data)
        page.refresh_from_db()
        self.assertEqual(page.pk, old_page_pk)
        self.assertEqual(page.heading, old_page_heading)

    def test_rp_admin_can_update_their_rps_page(self):
        my_rp = self.rp_user.roleassignment.revenue_programs.first()
        self.assertIsNotNone(my_rp)
        page = DonationPage.objects.filter(revenue_program=my_rp).first()
        self.assertIsNotNone(page)
        old_page_heading = page.heading
        old_page_pk = page.pk
        detail_url = f"/api/v1/pages/{old_page_pk}/"
        new_heading = old_page_heading[::-1]
        patch_data = {"heading": new_heading}
        self.assert_rp_user_can_patch(detail_url, patch_data)
        page.refresh_from_db()
        self.assertEqual(page.pk, old_page_pk)
        self.assertEqual(page.heading, new_heading)

    def test_rp_admin_cannot_update_another_rps_page(self):
        not_my_rp = RevenueProgram.objects.exclude(roleassignment__user=self.rp_user).first()
        self.assertIsNotNone(not_my_rp)
        page = DonationPage.objects.filter(revenue_program=not_my_rp).first()
        self.assertIsNotNone(page)
        old_page_heading = page.heading
        old_page_pk = page.pk
        detail_url = f"/api/v1/pages/{old_page_pk}/"
        new_heading = old_page_heading[::-1]
        patch_data = {"heading": new_heading}
        self.assert_rp_user_cannot_patch(detail_url, patch_data)
        page.refresh_from_db()
        self.assertEqual(page.pk, old_page_pk)
        self.assertEqual(page.heading, old_page_heading)

    # update
    # def test_patch_page_with_styles(self):
    #     request = self._create_patch_request(data=page_data)
    #     response = self.page_patch_view(request, pk=self.donation_page.pk)
    #     self.assertEqual(response.data["styles"]["id"], self.styles.pk)

    # @override_settings(MEDIA_ROOT="/tmp/media")
    # @override_settings(MEDIA_URL="/media/")
    # def test_patch_page_with_sidebar_elements(self):
    #     sidebar, files = setup_sidebar_fixture()
    #     for k, v in files.items():
    #         sidebar[k] = SimpleUploadedFile(
    #             name=f"{v.name}", content=get_test_image_file_jpeg().open("rb").read(), content_type="image/jpeg"
    #         )
    #     # do as hub_admin
    #     # dp = DonationPage.objects.get(pk=self.donation_page.pk)
    #     # assert dp.sidebar_elements == response.data.get("sidebar_elements")

    ########
    # Delete
    def test_superuser_can_delete_a_page(self):
        before_count = DonationPage.objects.count()
        page = DonationPage.objects.first()
        pk = page.pk
        detail_url = f"/api/v1/pages/{pk}/"
        self.assert_superuser_can_delete(detail_url)
        self.assertEqual(DonationPage.objects.count(), before_count - 1)
        self.assertFalse(DonationPage.objects.filter(pk=pk).exists())

    def test_hub_admin_can_delete_a_page(self):
        before_count = DonationPage.objects.count()
        page = DonationPage.objects.first()
        pk = page.pk
        detail_url = f"/api/v1/pages/{pk}/"
        self.assert_hub_admin_can_delete(detail_url)
        self.assertEqual(DonationPage.objects.count(), before_count - 1)
        self.assertFalse(DonationPage.objects.filter(pk=pk).exists())

    def test_org_admin_can_delete_their_orgs_page(self):
        before_count = DonationPage.objects.count()
        page = DonationPage.objects.filter(revenue_program__organization=self.org1).first()
        self.assertIsNotNone(page)
        pk = page.pk
        detail_url = f"/api/v1/pages/{pk}/"
        self.assert_org_admin_can_delete(detail_url)
        self.assertEqual(DonationPage.objects.count(), before_count - 1)
        self.assertFalse(DonationPage.objects.filter(pk=pk).exists())

    def test_org_admin_cannot_delete_another_orgs_page(self):
        before_count = DonationPage.objects.count()
        page = DonationPage.objects.exclude(revenue_program__organization=self.org1).first()
        self.assertIsNotNone(page)
        pk = page.pk
        detail_url = f"/api/v1/pages/{pk}/"
        self.assert_org_admin_cannot_delete(detail_url)
        self.assertEqual(DonationPage.objects.count(), before_count)
        self.assertTrue(DonationPage.objects.filter(pk=pk).exists())

    def test_rp_admin_can_delete_their_rps_page(self):
        my_rp = RevenueProgram.objects.filter(roleassignment__user=self.rp_user).first()
        self.assertIsNotNone(my_rp)
        before_count = DonationPage.objects.count()
        page = DonationPage.objects.filter(revenue_program=my_rp).first()
        self.assertIsNotNone(page)
        pk = page.pk
        detail_url = f"/api/v1/pages/{pk}/"
        self.assert_rp_user_can_delete(detail_url)
        self.assertEqual(DonationPage.objects.count(), before_count - 1)
        self.assertIsNone(DonationPage.objects.filter(pk=pk).first())

    def test_rp_admin_cannot_delete_another_rps_page(self):
        not_my_rp = RevenueProgram.objects.exclude(roleassignment__user=self.rp_user).first()
        self.assertIsNotNone(not_my_rp)
        before_count = DonationPage.objects.count()
        page = DonationPage.objects.filter(revenue_program=not_my_rp).first()
        self.assertIsNotNone(page)
        pk = page.pk
        detail_url = f"/api/v1/pages/{pk}/"
        self.assert_rp_user_cannot_delete(detail_url)
        self.assertEqual(DonationPage.objects.count(), before_count)
        self.assertTrue(DonationPage.objects.filter(pk=pk).exists())

    def test_org_admin_cannot_delete_another_orgs_page(self):
        before_count = DonationPage.objects.count()
        page = DonationPage.objects.exclude(revenue_program__organization=self.org1).first()
        self.assertIsNotNone(page)
        pk = page.pk
        detail_url = f"/api/v1/pages/{pk}/"
        self.assert_org_admin_cannot_delete(detail_url)
        self.assertEqual(DonationPage.objects.count(), before_count)
        self.assertTrue(DonationPage.objects.filter(pk=pk).exists())

    def test_rp_admin_can_delete_their_rps_page(self):
        my_rp = RevenueProgram.objects.filter(roleassignment__user=self.rp_user).first()
        self.assertIsNotNone(my_rp)
        before_count = DonationPage.objects.count()
        page = DonationPage.objects.filter(revenue_program=my_rp).first()
        self.assertIsNotNone(page)
        pk = page.pk
        detail_url = f"/api/v1/pages/{pk}/"
        self.assert_rp_user_can_delete(detail_url)
        self.assertEqual(DonationPage.objects.count(), before_count - 1)
        self.assertIsNone(DonationPage.objects.filter(pk=pk).first())

    def test_rp_admin_cannot_delete_another_rps_page(self):
        not_my_rp = RevenueProgram.objects.exclude(roleassignment__user=self.rp_user).first()
        self.assertIsNotNone(not_my_rp)
        before_count = DonationPage.objects.count()
        page = DonationPage.objects.filter(revenue_program=not_my_rp).first()
        self.assertIsNotNone(page)
        pk = page.pk
        detail_url = f"/api/v1/pages/{pk}/"
        self.assert_rp_user_cannot_delete(detail_url)
        self.assertEqual(DonationPage.objects.count(), before_count)
        self.assertTrue(DonationPage.objects.filter(pk=pk).exists())

    ######
    # List
    def test_page_list_uses_list_serializer(self):
        url = f"{reverse('donationpage-list')}?{settings.RP_SLUG_PARAM}={self.org1_rp1}&{settings.ORG_SLUG_PARAM}={self.org1.slug}"
        self.client.force_authenticate(user=self.hub_user)
        response = self.client.get(url)
        # list serializer does not have 'styles' field
        self.assertNotIn("styles", response.json())

    def test_superuser_can_list_all_pages(self):
        url = reverse("donationpage-list")
        self.assert_superuser_can_list(url, DonationPage.objects.count(), results_are_flat=True)

    def test_hub_admin_can_list_all_pages(self):
        url = reverse("donationpage-list")
        self.assert_hub_admin_can_list(url, DonationPage.objects.count(), results_are_flat=True)

    def test_org_admin_can_list_all_of_their_orgs_pages(self):
        org_pages_query = DonationPage.objects.filter(revenue_program__organization=self.org1)
        self.assertTrue(org_pages_query.exists())
        self.assertLess(org_pages_query.count(), DonationPage.objects.count())
        url = reverse("donationpage-list")
        self.assert_org_admin_can_list(
            url,
            org_pages_query.count(),
            assert_all=lambda items: DonationPage.objects.filter(
                pk__in=[item["id"] for item in items], revenue_program__organization=self.org1
            ).exists(),
            results_are_flat=True,
        )

    def test_rp_user_can_list_all_of_their_rps_pages(self):
        rp_pages_query = DonationPage.objects.filter(revenue_program__roleassignment__user=self.rp_user)
        self.assertTrue(rp_pages_query.exists())
        self.assertLess(rp_pages_query.count(), DonationPage.objects.count())
        url = reverse("donationpage-list")
        self.assert_rp_user_can_list(
            url,
            rp_pages_query.count(),
            assert_all=lambda items: DonationPage.objects.filter(
                pk__in=[item["id"] for item in items],
                revenue_program__in=self.rp_user.roleassignment.revenue_programs.all(),
            ).exists(),
            results_are_flat=True,
        )

    ##########
    # Retrieve
    def test_page_detail_uses_detail_serializer(self):
        page = DonationPage.objects.first()
        self.client.force_authenticate(user=self.hub_user)
        response = self.client.get(f"/api/v1/pages/{page.pk}/")
        # detail serializer should have 'styles' field
        self.assertIn("styles", response.json())

    def test_superuser_can_retrieve_page(self):
        page = DonationPage.objects.first()
        url = reverse("donationpage-detail", args=(page.pk,))
        self.assert_superuser_can_get(url)

    def test_hub_admin_can_retrieve_page(self):
        page = DonationPage.objects.first()
        url = reverse("donationpage-detail", args=(page.pk,))
        self.assert_superuser_can_get(url)

    def test_org_admin_can_retrieve_their_orgs_page(self):
        page = DonationPage.objects.filter(revenue_program__organization=self.org1).first()
        url = reverse("donationpage-detail", args=(page.pk,))
        self.assert_org_admin_can_get(url)

    def test_org_admin_cannot_retrieve_other_orgs_page(self):
        page = DonationPage.objects.exclude(revenue_program__organization=self.org1).first()
        self.assertIsNotNone(page)
        url = reverse("donationpage-detail", args=(page.pk,))
        self.assert_org_admin_cannot_get(url)

    def test_rp_user_can_retrieve_their_rps_page(self):
        page = DonationPage.objects.filter(
            revenue_program__in=self.rp_user.roleassignment.revenue_programs.all()
        ).first()
        self.assertIsNotNone(page)
        url = reverse("donationpage-detail", args=(page.pk,))
        self.assert_rp_user_can_get(url)

    def test_rp_user_cannot_retrieve_other_rps_page(self):
        page = DonationPage.objects.exclude(
            revenue_program__in=self.rp_user.roleassignment.revenue_programs.all()
        ).first()
        self.assertIsNotNone(page)
        url = reverse("donationpage-detail", args=(page.pk,))
        self.assert_rp_user_cannot_get(url)


class DonationPageFullDetailTest(APITestCase):
    def setUp(self):
        now = timezone.now()
        hour = datetime.timedelta(hours=1)
        self.revenue_program_1 = RevenueProgramFactory(slug="revenue_program_1")
        self.revenue_program_2 = RevenueProgramFactory(slug="revenue_program_2")
        self.page_1 = DonationPageFactory(
            published_date=now - hour, revenue_program=self.revenue_program_1, slug="page_1"
        )
        self.page_2 = DonationPageFactory(
            published_date=now - hour, revenue_program=self.revenue_program_1, slug="page_2"
        )
        self.page_3 = DonationPageFactory(
            published_date=now + hour, revenue_program=self.revenue_program_2, slug="page_3"
        )
        self.revenue_program_1.default_donation_page = self.page_2
        self.revenue_program_1.save()

    def _make_full_detail_request_with_params(self, rev_program=None, page=None, live=None):
        url = reverse("donationpage-live-detail") if live else reverse("donationpage-draft-detail")
        url += "?"
        if rev_program:
            url += f"revenue_program={rev_program}&"
        if page:
            url += f"page={page}&"
        if live:
            url += f"live={1 if live else 0}&"

        return self.client.get(url)

    def test_full_detail_rev_program_param_required(self):
        response = self._make_full_detail_request_with_params(page="testing")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Missing required parameter")

    def test_full_detail_page_with_live_param_searches_live(self):
        bad_response = self._make_full_detail_request_with_params(
            rev_program=self.revenue_program_2.slug, page=self.page_3.slug, live=True
        )
        # Returns 404 if no live page exists
        self.assertEqual(bad_response.status_code, 404)
        self.assertEqual(bad_response.data["detail"], "This page has not been published")

        good_response = self._make_full_detail_request_with_params(
            rev_program=self.revenue_program_1.slug, page=self.page_1.slug, live=True
        )
        self.assertEqual(good_response.status_code, 200)
        self.assertEqual(good_response.data["heading"], self.page_1.heading)

    def test_full_detail_returns_default_rev_page(self):
        response = self._make_full_detail_request_with_params(rev_program=self.revenue_program_1.slug, live=True)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.page_2.pk)

    def test_full_detail_no_such_rev_program(self):
        response = self._make_full_detail_request_with_params(rev_program="made-up-slug")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["detail"], "Could not find revenue program matching those parameters")

    def test_full_detail_no_such_page(self):
        response = self._make_full_detail_request_with_params(
            rev_program=self.revenue_program_1.slug, page="made-up-page"
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["detail"], "Could not find page matching those parameters")

    def test_full_detail_edit_insufficient_permissions(self):
        response = self._make_full_detail_request_with_params(rev_program=self.revenue_program_1.slug, live=False)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["detail"], "You do not have permission to edit this page")


class TemplateViewSetTest(AbstractTestCase):
    model = Template
    model_factory = TemplateFactory

    def setUp(self):
        super().setUp()
        self.create_resources()
        self.rev_program = self.rev_programs[0]
        self.page = DonationPageFactory(revenue_program=self.rev_program)
        self.list_url = f'{reverse("template-list")}?{settings.RP_SLUG_PARAM}={self.org1_rp1}&{settings.ORG_SLUG_PARAM}={self.org1.slug}'

    def test_template_create_adds_template(self):
        self.assertEqual(len(self.resources), self.resource_count)
        self.login()

        template_data = {
            "name": "New Template",
            "heading": "New Template",
            "page_pk": self.page.pk,
        }
        # format="json" here in order to prevent serializer from treating self.data as immutable.
        # https://stackoverflow.com/questions/52367379/why-is-django-rest-frameworks-request-data-sometimes-immutable
        response = self.client.post(self.list_url, template_data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Template.objects.count(), self.resource_count + 1)

        data = response.json()
        for k, v in template_data.items():
            # page_pk doesn't come back from the serializer.
            if k != "page_pk":
                self.assertEqual(v, data[k])

    def test_template_update_updates_template(self):
        template = self.resources[0]
        self.login()
        old_template_name = template.name
        old_template_pk = template.pk
        detail_url = f"/api/v1/templates/{old_template_pk}/"
        new_name = "Old Template With New Name"
        self.client.patch(detail_url, {"name": new_name})
        template = Template.objects.filter(pk=old_template_pk).first()
        self.assertEqual(template.pk, old_template_pk)
        self.assertNotEqual(template.name, old_template_name)
        self.assertEqual(template.name, new_name)

    def test_template_delete_deletes_template(self):
        template = self.resources[0]
        self.login()
        old_template_pk = template.pk
        detail_url = f"/api/v1/templates/{old_template_pk}/"
        self.client.delete(detail_url)
        self.assertRaises(Template.DoesNotExist, Template.objects.get, pk=old_template_pk)

    def test_template_list_uses_list_serializer(self):
        self.login()
        response = self.client.get(self.list_url)
        # list serializer does not have 'styles' field
        self.assertNotIn("styles", response.json())

    def test_template_detail_uses_detail_serializer(self):
        template = self.resources[0]
        self.login()
        response = self.client.get(f"/api/v1/templates/{template.pk}/")
        # detail serializer should have 'styles' field
        self.assertIn("styles", response.json())

        response = self.client.get(self.list_url)


class StylesViewsetTest(AbstractTestCase):
    model = Style
    model_factory = StyleFactory

    def setUp(self):
        super().setUp()
        self.create_resources()
        self.rev_program = RevenueProgramFactory()
        valid_styles_json = {}
        for k, v in required_style_keys.items():
            valid_styles_json[k] = v()
        self.styles_data = {
            "name": "New Test Styles",
            "revenue_program": {"name": self.rev_program.name, "slug": self.org1_rp1},
            "random_property": "test",
            "colors": {"primary": "testing pink"},
            **valid_styles_json,
        }
        self.list_url = f'{reverse("style-list")}?{settings.RP_SLUG_PARAM}={self.org1_rp1}&{settings.ORG_SLUG_PARAM}={self.org1.slug}'

    def test_flattened_to_internal_value(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.list_url, data=json.dumps(self.styles_data), content_type="application/json")

        self.assertEqual(response.status_code, 201)
        self.assertIn("id", response.data)
        new_styles_id = response.data["id"]
        new_styles = Style.objects.get(pk=new_styles_id)
        self.assertEqual(self.styles_data["random_property"], response.data["random_property"])
        self.assertEqual(new_styles.styles["colors"]["primary"], self.styles_data["colors"]["primary"])
