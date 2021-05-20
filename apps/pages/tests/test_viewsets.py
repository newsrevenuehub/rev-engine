from django.contrib.auth import get_user_model

from rest_framework.reverse import reverse

from apps.common.tests.test_resources import AbstractTestCase
from apps.pages.models import DonationPage, DonorBenefit, Template
from apps.pages.tests.factories import DonationPageFactory, DonorBenefitFactory, TemplateFactory


user_model = get_user_model()


class PageViewSetTest(AbstractTestCase):
    model = DonationPage
    model_factory = DonationPageFactory

    def setUp(self):
        super().setUp()
        self.create_resources()

    def test_page_create_adds_page(self):
        self.assertEqual(len(self.resources), self.resource_count)
        self.authenticate_user_for_resource()
        self.login()
        list_url = reverse("donationpage-list")
        page_data = {
            "title": "New DonationPage",
            "slug": "new-page",
            "organization": self.orgs[0].pk,
        }
        response = self.client.post(list_url, page_data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(DonationPage.objects.count(), self.resource_count + 1)

        data = response.json()
        for k, v in page_data.items():
            self.assertEqual(v, data[k])

    def test_page_update_updates_page(self):
        page = self.resources[0]
        self.authenticate_user_for_resource(page)
        self.login()
        old_page_title = page.title
        old_page_pk = page.pk
        detail_url = f"/api/v1/pages/{old_page_pk}/"
        new_title = "Old DonationPage With New Title"
        response = self.client.patch(detail_url, {"title": new_title})
        page = DonationPage.objects.get(pk=old_page_pk)
        self.assertEqual(page.pk, old_page_pk)
        self.assertNotEqual(page.title, old_page_title)
        self.assertEqual(page.title, new_title)

    def test_page_delete_deletes_page(self):
        page = self.resources[0]
        self.authenticate_user_for_resource(page)
        self.login()
        old_page_pk = page.pk
        detail_url = f"/api/v1/pages/{old_page_pk}/"

        response = self.client.delete(detail_url)
        self.assertRaises(DonationPage.DoesNotExist, DonationPage.objects.get, pk=old_page_pk)

    def test_page_list_uses_list_serializer(self):
        list_url = reverse("donationpage-list")
        response = self.client.get(list_url)
        # list serializer does not have 'styles' field
        self.assertNotIn("styles", response.json())

    def test_page_detail_uses_detail_serializer(self):
        self.authenticate_user_for_resource(self.resources[0])
        self.login()
        page_pk = self.resources[0].pk
        response = self.client.get(f"/api/v1/pages/{page_pk}/")
        # detail serializer should have 'styles' field
        self.assertIn("styles", response.json())

    def test_page_list_results_are_limited_by_ownership(self):
        user = user_model.objects.create()
        user_org = self.orgs[0]
        user.organizations.add(user_org)

        user_pages = DonationPage.objects.filter(organization=user_org)

        list_url = reverse("donationpage-list")

        self.authenticate_user_for_resource(user_pages[0])
        self.login()
        response = self.client.get(list_url)
        data = response.json()

        # Should return expected number of pages
        self.assertEqual(user_pages.count(), data["count"])

        returned_ids = [p["id"] for p in data["results"]]
        expected_ids = [p.id for p in user_pages]
        # Should return expected pages
        self.assertEqual(set(expected_ids), set(returned_ids))

    def test_anybody_can_access_page_detail(self):
        pass

    def test_only_owner_can_update_page(self):
        pass


class TemplateViewSetTest(AbstractTestCase):
    model = Template
    model_factory = TemplateFactory

    def setUp(self):
        super().setUp()
        self.create_resources()

    def test_template_create_adds_template(self):
        self.assertEqual(len(self.resources), self.resource_count)
        self.authenticate_user_for_resource()
        self.login()
        list_url = reverse("template-list")
        template_data = {
            "name": "New Template",
            "title": "New Template",
            "organization": self.orgs[0].pk,
        }
        response = self.client.post(list_url, template_data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Template.objects.count(), self.resource_count + 1)

        data = response.json()
        for k, v in template_data.items():
            self.assertEqual(v, data[k])

    def test_template_update_updates_template(self):
        template = self.resources[0]
        self.authenticate_user_for_resource(template)
        self.login()
        old_template_title = template.title
        old_template_pk = template.pk
        detail_url = f"/api/v1/templates/{old_template_pk}/"
        new_title = "Old Template With New Title"
        response = self.client.patch(detail_url, {"title": new_title})
        template = Template.objects.filter(pk=old_template_pk).first()
        self.assertEqual(template.pk, old_template_pk)
        self.assertNotEqual(template.title, old_template_title)
        self.assertEqual(template.title, new_title)

    def test_template_delete_deletes_template(self):
        template = self.resources[0]
        self.authenticate_user_for_resource(template)
        self.login()
        old_template_pk = template.pk
        detail_url = f"/api/v1/templates/{old_template_pk}/"
        response = self.client.delete(detail_url)
        self.assertRaises(Template.DoesNotExist, Template.objects.get, pk=old_template_pk)

    def test_template_list_uses_list_serializer(self):
        list_url = reverse("template-list")
        self.authenticate_user_for_resource(self.resources[0])
        self.login()
        response = self.client.get(list_url)
        # list serializer does not have 'styles' field
        self.assertNotIn("styles", response.json())

    def test_template_detail_uses_detail_serializer(self):
        template = self.resources[0]
        self.authenticate_user_for_resource(template)
        self.login()
        response = self.client.get(f"/api/v1/templates/{template.pk}/")
        # detail serializer should have 'styles' field
        self.assertIn("styles", response.json())

        list_url = reverse("donationpage-list")
        response = self.client.get(list_url)

    def test_template_list_results_are_limited_by_ownership(self):
        user = user_model.objects.create()
        user_org = self.orgs[0]
        user.organizations.add(user_org)

        user_templates = self.model.objects.filter(organization=user_org)

        list_url = reverse("template-list")

        self.authenticate_user_for_resource(user_templates[0])
        self.login()
        response = self.client.get(list_url)
        data = response.json()

        # Should return expected number of pages
        self.assertEqual(user_templates.count(), data["count"])

        returned_ids = [p["id"] for p in data["results"]]
        expected_ids = [p.id for p in user_templates]
        # Should return expected pages
        self.assertEqual(set(expected_ids), set(returned_ids))


class DonorBenefitViewSetTest(AbstractTestCase):
    model = DonorBenefit
    model_factory = DonorBenefitFactory

    def setUp(self):
        super().setUp()
        self.create_resources()

    def test_donor_benefit_list_uses_list_serializer(self):
        self.authenticate_user_for_resource()
        self.login()
        response = self.client.get("/api/v1/donor-benefits/")
        # list serializer does not have 'tiers' field
        self.assertNotIn("tiers", response.json())

    def test_donor_benefit_detail_uses_detail_serializer(self):
        donor_benefit = self.resources[0]
        self.authenticate_user_for_resource(donor_benefit)
        self.login()
        response = self.client.get(f"/api/v1/donor-benefits/{donor_benefit.pk}/")
        # detail serializer should have 'tiers' field
        self.assertIn("tiers", response.json())
