import datetime
import json

from django.conf import settings
from django.utils import timezone

from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from apps.api.tests import RevEngineApiAbstractTestCase
from apps.organizations.models import RevenueProgram
from apps.pages.models import DonationPage, Font, Style, Template
from apps.pages.tests.factories import FontFactory, StyleFactory, TemplateFactory
from apps.users.tests.utils import create_test_user


class PageViewSetTest(RevEngineApiAbstractTestCase):
    def setUp(self):
        super().setUp()
        self.default_page_creation_data = {
            "name": "My new page, tho",
            "heading": "New DonationPage",
            "slug": "new-page",
            "revenue_program": self.org1_rp1.pk,
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
        for attr in [key for key in creation_data.keys() if key != "revenue_program"]:
            self.assertEqual(getattr(created_page, attr), creation_data[attr])
        self.assertEqual(creation_data["revenue_program"], expected_rp.pk)

    ########
    # CREATE
    def test_superuser_can_create_a_page(self):
        before_count = DonationPage.objects.count()
        url = reverse("donationpage-list")
        self.assert_superuser_can_post(url, self.default_page_creation_data)
        self.assertEqual(DonationPage.objects.count(), before_count + 1)
        created_page = DonationPage.objects.get(name=self.default_page_creation_data["name"])
        self.assert_created_page_looks_right(created_page, self.org1, self.org1_rp1)

    def test_hub_user_can_create_a_page(self):
        before_count = DonationPage.objects.count()
        url = reverse("donationpage-list")
        self.assert_hub_admin_can_post(url, self.default_page_creation_data)
        self.assertEqual(DonationPage.objects.count(), before_count + 1)
        created_page = DonationPage.objects.get(name=self.default_page_creation_data["name"])
        self.assert_created_page_looks_right(created_page, self.org1, self.org1_rp1)

    def test_org_admin_can_create_a_page_for_their_org(self):
        org_pages_query = DonationPage.objects.filter(revenue_program__organization=self.org1)
        before_count = org_pages_query.count()
        url = reverse("donationpage-list")
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
            "revenue_program": self.org2_rp.pk,
        }
        url = reverse("donationpage-list")
        self.assert_org_admin_cannot_post(url, data, expected_status_code=status.HTTP_400_BAD_REQUEST)
        self.assertEqual(my_org_pages_query.count(), before_my_org_pages_count)
        self.assertEqual(other_org_pages_query.count(), before_other_org_count)

    def test_rp_admin_can_create_a_page_for_their_rp(self):
        rp = self.rp_user.roleassignment.revenue_programs.first()
        self.assertIsNotNone(rp)
        url = reverse("donationpage-list")
        my_rp_pages_query = DonationPage.objects.filter(
            revenue_program__in=self.rp_user.roleassignment.revenue_programs.all()
        )
        before_count = my_rp_pages_query.count()
        response = self.assert_rp_user_can_post(url, self.default_page_creation_data)
        self.assertEqual(my_rp_pages_query.count(), before_count + 1)
        created_page = DonationPage.objects.get(id=response.json()["id"])
        self.assert_created_page_looks_right(created_page, rp.organization, rp)

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
        data = {**self.default_page_creation_data}
        data["revenue_program"] = self.org2_rp.pk

        self.assert_rp_user_cannot_post(
            reverse("donationpage-list"), data, expected_status_code=status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(my_pages_query.count(), before_my_pages_count)
        self.assertEqual(others_pages_query.count(), before_others_count)

    def test_page_create_returns_validation_error_when_missing_revenue_program(self):
        self.client.force_authenticate(user=self.hub_user)
        data = {**self.default_page_creation_data}
        data.pop("revenue_program")
        response = self.client.post(reverse("donationpage-list"), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_page_create_returns_revenue_program_slug(self):
        """
        Page create must return revenue_program in order to navigate the user to the
        correct url for page edit, after creating a page.
        """
        url = reverse("donationpage-list")
        response = self.assert_hub_admin_can_post(url, self.default_page_creation_data)
        self.assertIn("revenue_program", response.data)
        self.assertIn("slug", response.data["revenue_program"])

    def test_page_create_returns_validation_error_when_violates_unique_constraint(self):
        response = self.assert_hub_admin_can_post(reverse("donationpage-list"), self.default_page_creation_data)
        # make sure first page was created successfully
        self.assertEqual(response.status_code, 201)
        # Then make it again and expect a validation error
        error_response = self.client.post(reverse("donationpage-list"), self.default_page_creation_data)
        self.assertEqual(error_response.status_code, 400)
        self.assertIn("non_field_errors", error_response.data)
        self.assertEqual(
            str(error_response.data["non_field_errors"][0]), "The fields revenue_program, slug must make a unique set."
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
        detail_url = reverse("donationpage-detail", args=(page.pk,))
        new_heading = old_page_heading[::-1]
        patch_data = {"heading": new_heading}
        self.assert_org_admin_cannot_patch(detail_url, patch_data, expected_status_code=status.HTTP_404_NOT_FOUND)
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

    ########
    # Delete
    def test_superuser_can_delete_a_page(self):
        before_count = DonationPage.objects.count()
        page = DonationPage.objects.first()
        # contributions protect referenced page from being deleted, so need to delete these first
        page.contribution_set.all().delete()
        pk = page.pk
        detail_url = f"/api/v1/pages/{pk}/"
        self.assert_superuser_can_delete(detail_url)
        self.assertEqual(DonationPage.objects.count(), before_count - 1)
        self.assertFalse(DonationPage.objects.filter(pk=pk).exists())

    def test_hub_admin_can_delete_a_page(self):
        before_count = DonationPage.objects.count()
        page = DonationPage.objects.first()
        # contributions protect referenced page from being deleted, so need to delete these first
        page.contribution_set.all().delete()
        pk = page.pk
        detail_url = f"/api/v1/pages/{pk}/"
        self.assert_hub_admin_can_delete(detail_url)
        self.assertEqual(DonationPage.objects.count(), before_count - 1)
        self.assertFalse(DonationPage.objects.filter(pk=pk).exists())

    def test_org_admin_can_delete_their_orgs_page(self):
        before_count = DonationPage.objects.count()
        page = DonationPage.objects.filter(revenue_program__organization=self.org1).first()
        # contributions protect referenced page from being deleted, so need to delete these first
        page.contribution_set.all().delete()
        self.assertIsNotNone(page)
        pk = page.pk
        url = reverse("donationpage-detail", args=(pk,))
        self.assert_org_admin_can_delete(url)
        self.assertEqual(DonationPage.objects.count(), before_count - 1)
        self.assertFalse(DonationPage.objects.filter(pk=pk).exists())

    def test_org_admin_cannot_delete_another_orgs_page(self):
        before_count = DonationPage.objects.count()
        page = DonationPage.objects.exclude(revenue_program__organization=self.org1).first()
        self.assertIsNotNone(page)
        # contributions protect referenced page from being deleted, so need to delete these first
        page.contribution_set.all().delete()
        pk = page.pk
        detail_url = reverse("donationpage-detail", args=(pk,))
        self.assert_org_admin_cannot_delete(detail_url, expected_status_code=status.HTTP_403_FORBIDDEN)
        self.assertEqual(DonationPage.objects.count(), before_count)
        self.assertTrue(DonationPage.objects.filter(pk=pk).exists())

    def test_rp_admin_can_delete_their_rps_page(self):
        my_rp = RevenueProgram.objects.filter(roleassignment__user=self.rp_user).first()
        self.assertIsNotNone(my_rp)
        before_count = DonationPage.objects.count()
        page = DonationPage.objects.filter(revenue_program=my_rp).first()
        self.assertIsNotNone(page)
        # contributions protect referenced page from being deleted, so need to delete these first
        page.contribution_set.all().delete()
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
        # contributions protect referenced page from being deleted, so need to delete these first
        page.contribution_set.all().delete()
        pk = page.pk
        detail_url = reverse("donationpage-detail", args=(pk,))
        self.assert_rp_user_cannot_delete(detail_url, expected_status_code=status.HTTP_403_FORBIDDEN)
        self.assertEqual(DonationPage.objects.count(), before_count)
        self.assertTrue(DonationPage.objects.filter(pk=pk).exists())

    ######
    # List
    def test_page_list_uses_list_serializer(self):
        url = reverse("donationpage-list")
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
        reverse("donationpage-detail", args=(page.pk,))

    def test_live_detail_page_happy_path(self):
        page = DonationPage.objects.first()
        # ensure it's considered "live"
        page.published_date = timezone.now() - datetime.timedelta(days=1)
        page.save()
        self.assertTrue(page.is_live)
        url = f'{reverse("donationpage-live-detail")}?revenue_program={page.revenue_program.slug}&page={page.slug}'
        self.assert_unauthed_can_get(url)

    def test_live_detail_page_missing_query_parms(self):
        page = DonationPage.objects.first()
        # ensure it's considered "live"
        page.published_date = timezone.now() - datetime.timedelta(days=1)
        page.save()
        self.assertTrue(page.is_live)
        url = f'{reverse("donationpage-live-detail")}'
        response = self.assert_unuauthed_cannot_get(url, status=status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), {"detail": "Missing required parameter"})

    def test_live_detail_page_when_not_published(self):
        page = DonationPage.objects.first()
        page.published_date = None
        page.save()
        self.assertFalse(page.is_live)
        url = f'{reverse("donationpage-live-detail")}?revenue_program={page.revenue_program.slug}&page={page.slug}'
        response = self.assert_unuauthed_cannot_get(url, status=status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json(), {"detail": "This page has not been published"})

    def test_live_detail_page_when_payment_provider_unverified(self):
        page = DonationPage.objects.first()
        page.published_date = timezone.now() - datetime.timedelta(days=1)
        page.save()
        self.assertTrue(page.is_live)
        page.revenue_program.payment_provider.stripe_verified = False
        page.revenue_program.payment_provider.save()
        self.assertFalse(page.revenue_program.payment_provider.is_verified_with_default_provider())
        url = f'{reverse("donationpage-live-detail")}?revenue_program={page.revenue_program.slug}&page={page.slug}'
        response = self.assert_unuauthed_cannot_get(url, status=status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json(), {"detail": "RevenueProgram does not have a fully verified payment provider"})

    def test_live_detail_page_when_styles(self):
        page = DonationPage.objects.first()
        custom_style = {
            "foo": "bar",
        }
        style = StyleFactory(org=self.org1, revenue_program=self.org1_rp1, styles=custom_style)
        page.styles = style
        page.published_date = timezone.now() - datetime.timedelta(days=1)
        page.save()
        self.assertTrue(page.is_live)
        url = f'{reverse("donationpage-live-detail")}?revenue_program={page.revenue_program.slug}&page={page.slug}'
        response = self.assert_unauthed_can_get(url)
        self.assertEqual(response.json()["styles"]["styles"], custom_style)

    def test_draft_detail_page_happy_path(self):
        page = DonationPage.objects.first()
        page.published_date = timezone.now() - datetime.timedelta(days=1)
        page.save()
        self.assertTrue(page.is_live)
        url = f'{reverse("donationpage-draft-detail")}?revenue_program={page.revenue_program.slug}&page={page.slug}'
        self.assert_rp_user_can_get(url)


class TemplateViewSetTest(RevEngineApiAbstractTestCase):
    model = Template
    model_factory = TemplateFactory

    def setUp(self):
        super().setUp()
        self.list_url = f'{reverse("template-list")}?{settings.RP_SLUG_PARAM}={self.org1_rp1.slug}'
        self.my_orgs_page = DonationPage.objects.filter(revenue_program__organization=self.org1).first()
        self.template = TemplateFactory(revenue_program=self.org1_rp1)
        self.other_orgs_template = TemplateFactory(revenue_program=self.org2_rp)
        self.other_rps_template = TemplateFactory(revenue_program=self.org1_rp2)
        self.other_orgs_page = DonationPage.objects.exclude(revenue_program__organization=self.org1).first()
        self.other_rps_page = self.org1_rp2.donationpage_set.first()
        for item in (
            self.my_orgs_page,
            self.template,
            self.other_orgs_template,
            self.other_rps_template,
            self.other_orgs_page,
            self.other_rps_page,
        ):
            self.assertIsNotNone(item)

        self._base_new_template_data = {
            "name": "New Template",
            "heading": "mY heading",
        }

    @property
    def create_template_data_valid(self):
        return {**self._base_new_template_data, "page": self.my_orgs_page.pk}

    @property
    def create_template_data_invalid_for_other_org(self):
        return {**self._base_new_template_data, "page": self.other_orgs_page.pk}

    @property
    def create_template_data_invalid_for_another_rp(self):
        return {**self._base_new_template_data, "page": self.other_rps_page.pk}

    def assert_created_page_response_data_looks_right(self, request_data, created_instance):
        self.assertEqual(request_data["name"], "New Template")
        self.assertEqual(request_data["heading"], created_instance.heading)

    ########
    # Create
    def test_superuser_can_create_a_new_template(self):
        old_count = Template.objects.count()
        response = self.assert_superuser_can_post(self.list_url, self.create_template_data_valid)
        self.assert_created_page_response_data_looks_right(
            self.create_template_data_valid, Template.objects.get(pk=response.json()["id"])
        )
        self.assertEqual(Template.objects.count(), old_count + 1)

    def test_hub_user_can_create_a_new_template(self):
        old_count = Template.objects.count()
        response = self.assert_hub_admin_can_post(self.list_url, self.create_template_data_valid)
        self.assert_created_page_response_data_looks_right(
            self.create_template_data_valid, Template.objects.get(pk=response.json()["id"])
        )
        self.assertEqual(Template.objects.count(), old_count + 1)

    def test_org_user_can_create_a_template(self):
        old_count = Template.objects.count()
        response = self.assert_org_admin_can_post(self.list_url, self.create_template_data_valid)
        self.assert_created_page_response_data_looks_right(
            self.create_template_data_valid, Template.objects.get(pk=response.json()["id"])
        )
        self.assertEqual(Template.objects.count(), old_count + 1)

    def test_org_user_cannot_create_a_template_from_an_unowned_page(self):
        old_count = Template.objects.count()
        response = self.assert_org_admin_cannot_post(
            self.list_url,
            self.create_template_data_invalid_for_other_org,
            expected_status_code=status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(response.json()["page"][0], "Not found")
        self.assertEqual(Template.objects.count(), old_count)

    def test_rp_user_can_create_a_template_for_their_rps_page(self):
        old_count = Template.objects.count()
        response = self.assert_rp_user_can_post(self.list_url, self.create_template_data_valid)
        self.assert_created_page_response_data_looks_right(
            self.create_template_data_valid, Template.objects.get(pk=response.json()["id"])
        )
        self.assertEqual(Template.objects.count(), old_count + 1)

    def test_rp_user_cannot_create_a_template_for_another_rps_page(self):
        old_count = Template.objects.count()
        self.assert_rp_user_cannot_post(
            self.list_url,
            self.create_template_data_invalid_for_another_rp,
            expected_status_code=status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(Template.objects.count(), old_count)

    def test_rp_user_cannot_create_a_template_from_an_unowned_page(self):
        old_count = Template.objects.count()
        response = self.assert_rp_user_cannot_post(
            self.list_url,
            self.create_template_data_invalid_for_other_org,
            expected_status_code=status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(response.json()["page"][0], "Not found")
        self.assertEqual(Template.objects.count(), old_count)

    ###############
    # Read (Detail)
    def test_template_detail_uses_detail_serializer(self):
        """A distinct serializer is used for detail viwe, so we test for that"""
        template = Template.objects.first()
        response = self.assert_superuser_can_get(reverse("template-detail", args=(template.pk,)))
        # detail serializer should have 'styles' field
        self.assertIn("styles", response.json())
        response = self.client.get(self.list_url)

    def test_superuser_can_retrieve_a_template(self):
        self.assert_superuser_can_get(reverse("template-detail", args=(self.template.pk,)))

    def test_hub_user_can_retrieve_a_template(self):
        self.assert_hub_admin_can_get(reverse("template-detail", args=(self.template.pk,)))

    def test_org_user_can_retrieve_a_template(self):
        self.assert_org_admin_can_get(reverse("template-detail", args=(self.template.pk,)))

    def test_org_user_can_retrieve_an_unowned_template(self):
        self.assert_org_admin_cannot_get(reverse("template-detail", args=(self.other_orgs_page.pk,)))

    def test_rp_user_can_retrieve_a_template(self):
        self.assert_rp_user_can_get(reverse("template-detail", args=(self.template.pk,)))

    def test_rp_user_can_retrieve_an_unowned_template(self):
        self.assert_rp_user_cannot_get(reverse("template-detail", args=(self.other_rps_page.pk,)))

    #############
    # Read (List)

    def test_template_list_uses_list_serializer(self):
        """A distinct serializer is used to list templates, so we test for that"""
        response = self.assert_superuser_can_get(self.list_url)
        # list serializer does not have 'styles' field
        self.assertNotIn("styles", response.json())

    def test_superuser_can_list_templates(self):
        self.assert_superuser_can_list(self.list_url, Template.objects.count(), results_are_flat=True)

    def test_hub_user_can_list_templates(self):
        self.assert_hub_admin_can_list(self.list_url, Template.objects.count(), results_are_flat=True)

    def test_org_user_can_list_templates(self):
        self.assert_org_admin_can_list(
            self.list_url,
            Template.objects.filter(revenue_program__organization=self.org1).count(),
            assert_item=lambda x: x["revenue_program"] in self.org1.revenueprogram_set.values_list("pk", flat=True),
            results_are_flat=True,
        )

    def test_rp_user_can_list_templates(self):
        eligible_templates = Template.objects.filter(
            revenue_program__in=self.rp_user.roleassignment.revenue_programs.all()
        )
        self.assert_rp_user_can_list(
            self.list_url,
            eligible_templates.count(),
            assert_item=lambda x: x["revenue_program"] in eligible_templates,
            results_are_flat=True,
        )

    ########
    # Update

    def test_superuser_can_update_a_template(self):
        url = reverse("template-detail", args=(self.template.pk,))
        new_name = "updated name"
        self.assertEqual(Template.objects.filter(name=new_name).count(), 0)
        update_data = {"name": new_name}
        response = self.assert_superuser_can_patch(url, update_data)
        self.assertEqual(response.json()["name"], new_name)
        self.template.refresh_from_db()
        self.assertEqual(self.template.name, new_name)

    def test_hub_user_can_update_a_template(self):
        url = reverse("template-detail", args=(self.template.pk,))
        new_name = "updated name"
        self.assertEqual(Template.objects.filter(name=new_name).count(), 0)
        update_data = {"name": new_name}
        response = self.assert_hub_admin_can_patch(url, update_data)
        self.assertEqual(response.json()["name"], new_name)
        self.template.refresh_from_db()
        self.assertEqual(self.template.name, new_name)

    def test_org_user_can_update_a_template_for_an_owned_page(self):
        url = reverse("template-detail", args=(self.template.pk,))
        new_name = "updated name"
        self.assertEqual(Template.objects.filter(name=new_name).count(), 0)
        update_data = {"name": new_name}
        response = self.assert_org_admin_can_patch(url, update_data)
        self.assertEqual(response.json()["name"], new_name)
        self.template.refresh_from_db()
        self.assertEqual(self.template.name, new_name)

    def test_org_user_cannot_update_a_template_for_an_unowned_page(self):
        url = reverse("template-detail", args=(self.other_orgs_page.pk,))
        new_name = "updated name"
        self.assertEqual(Template.objects.filter(name=new_name).count(), 0)
        update_data = {"name": new_name}
        self.assert_org_admin_cannot_patch(url, update_data)
        self.assertEqual(Template.objects.filter(name=new_name).count(), 0)

    def test_rp_user_can_update_a_template_for_an_owned_page(self):
        url = reverse("template-detail", args=(self.template.pk,))
        new_name = "updated name"
        self.assertEqual(Template.objects.filter(name=new_name).count(), 0)
        update_data = {"name": new_name}
        response = self.assert_rp_user_can_patch(url, update_data)
        self.assertEqual(response.json()["name"], new_name)
        self.template.refresh_from_db()
        self.assertEqual(self.template.name, new_name)

    def test_rp_user_cannot_udpate_a_template_for_an_unowned_page(self):
        url = reverse("template-detail", args=(self.other_rps_page.pk,))
        new_name = "updated name"
        self.assertEqual(Template.objects.filter(name=new_name).count(), 0)
        update_data = {"name": new_name}
        self.assert_rp_user_cannot_patch(url, update_data, expected_status_code=status.HTTP_404_NOT_FOUND)
        self.assertEqual(Template.objects.filter(name=new_name).count(), 0)

    ########
    # Delete
    def test_superuser_can_delete_a_template(self):
        old_count = Template.objects.count()
        pk = self.template.pk
        url = reverse("template-detail", args=(pk,))
        self.assert_superuser_can_delete(url)
        self.assertEqual(Template.objects.count(), old_count - 1)
        self.assertFalse(Template.objects.filter(pk=pk).exists())

    def test_hub_user_can_delete_a_template(self):
        old_count = Template.objects.count()
        pk = self.template.pk
        url = reverse("template-detail", args=(pk,))
        self.assert_hub_admin_can_delete(url)
        self.assertEqual(Template.objects.count(), old_count - 1)
        self.assertFalse(Template.objects.filter(pk=pk).exists())

    def test_org_user_can_delete_an_owned_template(self):
        old_count = Template.objects.count()
        pk = self.template.pk
        url = reverse("template-detail", args=(pk,))
        self.assert_org_admin_can_delete(url)
        self.assertEqual(Template.objects.count(), old_count - 1)
        self.assertFalse(Template.objects.filter(pk=pk).exists())

    def test_org_user_cannot_delete_an_unowned_template(self):
        old_count = Template.objects.count()
        pk = self.other_orgs_template.pk
        url = reverse("template-detail", args=(pk,))
        self.assert_org_admin_cannot_delete(url, expected_status_code=status.HTTP_404_NOT_FOUND)
        self.assertEqual(Template.objects.count(), old_count)
        self.assertTrue(Template.objects.filter(pk=pk).exists())

    def test_rp_user_can_delete_an_owned_template(self):
        url = reverse("template-detail", args=(self.template.pk,))
        old_count = Template.objects.count()
        pk = self.template.pk
        url = reverse("template-detail", args=(pk,))
        self.assert_org_admin_can_delete(url)
        self.assertEqual(Template.objects.count(), old_count - 1)
        self.assertFalse(Template.objects.filter(pk=pk).exists())

    def test_rp_user_cannot_delete_an_unowned_template(self):
        url = reverse("template-detail", args=(self.other_rps_template.pk,))
        self.assertGreater(before_count := Template.objects.count(), 0)
        self.assert_rp_user_cannot_delete(url, expected_status_code=status.HTTP_404_NOT_FOUND)
        self.assertEqual(Template.objects.count(), before_count)
        self.assertTrue(Template.objects.filter(pk=self.other_rps_template.pk).exists())

    ######
    # Misc

    def test_unexpected_role_type(self):
        novel = create_test_user(role_assignment_data={"role_type": "holy-moley"})
        self.assert_user_cannot_get(
            reverse("template-list"),
            novel,
            expected_status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class StylesViewsetTest(RevEngineApiAbstractTestCase):
    def setUp(self):
        super().setUp()
        with open("apps/pages/tests/fixtures/create-style-payload.json") as fl:
            self.styles_create_data_fixture = json.load(fl)

    @property
    def create_style_payload(self):
        return {
            **self.styles_create_data_fixture,
            "revenue_program": self.org1_rp1.pk,
        }

    @property
    def create_style_payload_different_org(self):
        return {
            **self.styles_create_data_fixture,
            "revenue_program": self.org2_rp.pk,
        }

    @property
    def create_style_payload_different_rp(self):
        return {
            **self.styles_create_data_fixture,
            "revenue_program": self.org1_rp2.pk,
        }

    ########
    # Create

    def assert_created_style_is_correct(self, create_payload, created_instance):
        self.assertEqual(create_payload["name"], created_instance.name)
        self.assertEqual(create_payload["revenue_program"], created_instance.revenue_program.pk)
        skip_keys = ["name", "revenue_program"]
        for key, val in [(key, val) for key, val in create_payload.items() if key not in skip_keys]:
            self.assertEqual(val, created_instance.styles[key])

    def test_superuser_can_create_a_style(self):
        before_count = Style.objects.count()
        payload = self.create_style_payload
        response = self.assert_superuser_can_post(reverse("style-list"), payload)
        new_style = Style.objects.get(pk=response.data["id"])
        self.assert_created_style_is_correct(payload, new_style)
        self.assertEqual(Style.objects.count(), before_count + 1)

    def test_hub_admin_can_create_a_style(self):
        before_count = Style.objects.count()
        payload = self.create_style_payload
        response = self.assert_hub_admin_can_post(reverse("style-list"), payload)
        new_style = Style.objects.get(pk=response.data["id"])
        self.assert_created_style_is_correct(payload, new_style)
        self.assertEqual(Style.objects.count(), before_count + 1)

    def test_org_admin_can_create_a_style_for_their_org(self):
        before_count = Style.objects.count()
        payload = self.create_style_payload
        response = self.assert_org_admin_can_post(reverse("style-list"), payload)
        new_style = Style.objects.get(pk=response.data["id"])
        self.assert_created_style_is_correct(payload, new_style)
        self.assertEqual(Style.objects.count(), before_count + 1)

    def test_org_admin_cannot_create_a_style_for_another_org(self):
        before_count = Style.objects.count()
        self.assert_org_admin_cannot_post(
            reverse("style-list"),
            self.create_style_payload_different_org,
            expected_status_code=status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(Style.objects.count(), before_count)

    def test_rp_user_can_create_a_style(self):
        before_count = Style.objects.count()
        payload = self.create_style_payload
        response = self.assert_rp_user_can_post(reverse("style-list"), payload)
        new_style = Style.objects.get(pk=response.data["id"])
        self.assert_created_style_is_correct(payload, new_style)
        self.assertEqual(Style.objects.count(), before_count + 1)

    def test_rp_user_cannot_create_a_style_for_an_unowned_rp(self):
        before_count = Style.objects.count()
        self.assert_rp_user_cannot_post(
            reverse("style-list"),
            self.create_style_payload_different_rp,
            expected_status_code=status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(Style.objects.count(), before_count)

    #################
    # Read - Retrieve

    def test_superuser_can_retrieve_a_style(self):
        url = reverse("style-detail", args=(Style.objects.first().pk,))
        self.assert_superuser_can_get(url)

    def test_hub_user_can_retrieve_a_style(self):
        url = reverse("style-detail", args=(Style.objects.first().pk,))
        self.assert_hub_admin_can_get(url)

    def test_org_admin_can_retrieve_a_style_they_own(self):
        self.assertIsNotNone(style := Style.objects.filter(revenue_program=self.org1_rp1).first())
        url = reverse("style-detail", args=(style.pk,))
        self.assert_org_admin_can_get(url)

    def test_org_admin_cannot_retrieve_a_style_they_do_not_own(self):
        self.assertIsNotNone(style := Style.objects.exclude(revenue_program__organization=self.org1).first())
        url = reverse("style-detail", args=(style.pk,))
        self.assert_org_admin_cannot_get(url)

    def test_rp_user_can_retrieve_a_style_they_own(self):
        self.assertIsNotNone(style := Style.objects.filter(revenue_program=self.org1_rp1).first())
        url = reverse("style-detail", args=(style.pk,))
        self.assert_rp_user_can_get(url)

    def test_rp_user_cannot_retrieve_a_style_they_do_not_own(self):
        self.assertIsNotNone(
            style := (
                Style.objects.filter(revenue_program__organization=self.org1)
                .exclude(revenue_program=self.org1_rp1)
                .first()
            )
        )
        url = reverse("style-detail", args=(style.pk,))
        self.assert_rp_user_cannot_get(url)

    #############
    # Read - List

    def test_superuser_can_list_styles(self):
        url = reverse("style-list")
        self.assertGreater(expected_count := Style.objects.count(), 1)
        self.assert_superuser_can_list(url, expected_count, results_are_flat=True)

    def test_hub_admin_can_list_styles(self):
        url = reverse("style-list")
        self.assertGreater(expected_count := Style.objects.count(), 1)
        self.assert_hub_admin_can_list(url, expected_count, results_are_flat=True)

    def test_org_admin_can_list_styles(self):
        url = reverse("style-list")
        self.assertGreater(expected_count := Style.objects.filter(revenue_program__organization=self.org1).count(), 1)
        self.assert_org_admin_can_list(
            url,
            expected_count,
            assert_item=lambda x: x["revenue_program"] in self.org1.revenueprogram_set.values_list("id", flat=True),
            results_are_flat=True,
        )

    def test_rp_user_can_list_styles(self):
        url = reverse("style-list")
        self.assertGreater(
            expected_count := (
                Style.objects.filter(revenue_program__in=self.rp_user.roleassignment.revenue_programs.all()).count()
            ),
            0,
        )
        self.assert_rp_user_can_list(
            url,
            expected_count,
            assert_item=lambda x: x["revenue_program"] in self.org1.revenueprogram_set.values_list("id", flat=True),
            results_are_flat=True,
        )

    ########
    # Update

    def test_superuser_can_update_a_style(self):
        self.assertIsNotNone(style := Style.objects.first())
        before_last_modified = style.modified
        pk = style.pk
        url = reverse("style-detail", args=(pk,))
        new_color = "new-color"
        data = self.create_style_payload
        data["colors"]["primary"] = new_color
        self.assertNotEqual(style.styles["colors"]["primary"], new_color)
        self.assert_superuser_can_patch(url, data)
        style.refresh_from_db()
        self.assertGreater(style.modified, before_last_modified)
        self.assertEqual(style.styles["colors"]["primary"], new_color)

    def test_hub_user_can_update_a_style(self):
        self.assertIsNotNone(style := Style.objects.first())
        before_last_modified = style.modified
        pk = style.pk
        url = reverse("style-detail", args=(pk,))
        new_color = "new-color"
        data = self.create_style_payload
        data["colors"]["primary"] = new_color
        self.assertNotEqual(style.styles["colors"]["primary"], new_color)
        self.assert_hub_admin_can_patch(url, data)
        style.refresh_from_db()
        self.assertGreater(style.modified, before_last_modified)
        self.assertEqual(style.styles["colors"]["primary"], new_color)

    def test_org_admin_can_update_a_style_they_own(self):
        self.assertIsNotNone(style := Style.objects.filter(revenue_program__organization=self.org1).first())
        before_last_modified = style.modified
        pk = style.pk
        url = reverse("style-detail", args=(pk,))
        new_color = "new-color"
        data = self.create_style_payload
        data["colors"]["primary"] = new_color
        self.assertNotEqual(style.styles["colors"]["primary"], new_color)
        self.assert_org_admin_can_patch(url, data)
        style.refresh_from_db()
        self.assertGreater(style.modified, before_last_modified)
        self.assertEqual(style.styles["colors"]["primary"], new_color)

    def test_org_admin_cannot_update_a_style_they_do_not_own(self):
        self.assertIsNotNone(style := Style.objects.exclude(revenue_program__organization=self.org1).first())
        before_last_modified = style.modified
        pk = style.pk
        url = reverse("style-detail", args=(pk,))
        new_color = "new-color"
        data = self.create_style_payload
        data["colors"]["primary"] = new_color
        self.assert_org_admin_cannot_patch(url, data)
        style.refresh_from_db()
        self.assertEqual(style.modified, before_last_modified)

    def test_rp_user_can_update_a_style_they_own(self):
        self.assertIsNotNone(
            style := Style.objects.filter(
                revenue_program__in=self.rp_user.roleassignment.revenue_programs.all()
            ).first()
        )
        url = reverse("style-detail", args=(style.pk,))
        before_last_modified = style.modified
        pk = style.pk
        url = reverse("style-detail", args=(pk,))
        new_color = "new-color"
        data = self.create_style_payload
        data["colors"]["primary"] = new_color
        self.assertNotEqual(style.styles["colors"]["primary"], new_color)
        self.assert_rp_user_can_patch(url, data)
        style.refresh_from_db()
        self.assertGreater(style.modified, before_last_modified)
        self.assertEqual(style.styles["colors"]["primary"], new_color)

    def test_rp_user_cannot_update_a_style_they_do_not_own(self):
        self.assertIsNotNone(
            style := (
                Style.objects.filter(revenue_program__organization=self.org1)
                .exclude(revenue_program=self.org1_rp1)
                .first()
            )
        )
        before_last_modified = style.modified
        pk = style.pk
        url = reverse("style-detail", args=(pk,))
        new_color = "new-color"
        data = self.create_style_payload
        data["colors"]["primary"] = new_color
        self.assert_rp_user_cannot_patch(url, data, expected_status_code=status.HTTP_404_NOT_FOUND)
        style.refresh_from_db()
        self.assertEqual(style.modified, before_last_modified)
        url = reverse("style-detail", args=(style.pk,))

    ########
    # Delete

    def test_superuser_can_delete_a_style(self):
        self.assertIsNotNone(style := Style.objects.first())
        before_count = Style.objects.count()
        pk = style.pk
        url = reverse("style-detail", args=(pk,))
        self.assert_superuser_can_delete(url)
        self.assertEqual(Style.objects.count(), before_count - 1)
        self.assertFalse(Style.objects.filter(pk=pk).exists())

    def test_org_admin_cannot_delete_a_style_they_do_not_own(self):
        self.assertIsNotNone(style := Style.objects.exclude(revenue_program__organization=self.org1).first())
        before_count = Style.objects.count()
        pk = style.pk
        url = reverse("style-detail", args=(pk,))
        self.assert_org_admin_cannot_delete(url, expected_status_code=status.HTTP_403_FORBIDDEN)
        self.assertEqual(Style.objects.count(), before_count)
        self.assertTrue(Style.objects.filter(pk=pk).exists())

    def test_rp_user_cannot_delete_a_style_they_do_not_own(self):
        self.assertIsNotNone(
            style := (
                Style.objects.filter(revenue_program__organization=self.org1)
                .exclude(revenue_program=self.org1_rp1)
                .first()
            )
        )
        before_count = Style.objects.count()
        pk = style.pk
        url = reverse("style-detail", args=(pk,))
        self.assert_rp_user_cannot_delete(url, expected_status_code=status.HTTP_403_FORBIDDEN)
        self.assertEqual(Style.objects.count(), before_count)
        self.assertTrue(Style.objects.filter(pk=pk).exists())

    ######
    # Misc

    def test_unexpected_role_type(self):
        novel = create_test_user(role_assignment_data={"role_type": "holy-moley"})
        self.assert_user_cannot_get(
            reverse("style-list"), novel, expected_status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class FontViewSetTest(RevEngineApiAbstractTestCase):
    def setUp(self):
        super().setUp()
        for x in range(3):
            FontFactory()

    def test_authed_user_can_retrieve(self):
        self.assert_user_can_get(reverse("font-detail", args=(Font.objects.first().pk,)), self.generic_user)

    def test_authed_user_can_list(self):
        self.assert_user_can_list(reverse("font-list"), self.generic_user, Font.objects.count(), results_are_flat=True)

    def test_authed_cannot_create(self):
        self.assert_user_cannot_post(reverse("font-list"), self.generic_user, {}, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_authed_cannot_update(self):
        self.assert_user_cannot_patch(
            reverse("font-detail", args=(Font.objects.first().pk,)),
            self.generic_user,
            {},
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def test_authed_cannot_delete(self):
        self.assert_user_cannot_delete(
            reverse("font-detail", args=(Font.objects.first().pk,)),
            self.generic_user,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class TestRetrieveUserEndpoint(APITestCase):
    def test_happy_path(self):
        user = create_test_user()
        self.client.force_authenticate(user)
        response = self.client.get(reverse("user-retrieve"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
