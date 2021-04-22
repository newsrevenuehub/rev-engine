from apps.organizations.tests.factories import OrganizationFactory
from apps.pages.models import DonorBenefit, Page, Template
from apps.pages.tests.factories import DonorBenefitFactory, PageFactory, TemplateFactory
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase


class PageViewSetTest(APITestCase):
    def setUp(self):
        self.page_count = 5
        for i in range(self.page_count):
            PageFactory()

        self.pages = Page.objects.all()
        self.org = OrganizationFactory()

    def test_page_list_returns_results(self):
        list_url = reverse("page-list")
        response = self.client.get(list_url)
        pages = Page.objects.all()
        self.assertEqual(len(response.data), len(pages))

        page_titles = [p["title"] for p in response.data]
        expected_page_titles = [p.title for p in pages]
        self.assertEqual(page_titles, expected_page_titles)

    def test_page_create_adds_page(self):
        self.assertEqual(len(self.pages), self.page_count)
        list_url = reverse("page-list")
        response = self.client.post(
            list_url, {"title": "New Page", "slug": "new-page", "organization": self.org.pk}
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Page.objects.count(), self.page_count + 1)

    def test_page_update_updates_page(self):
        page = self.pages[0]
        old_page_title = page.title
        old_page_pk = page.pk
        detail_url = f"/api/v1/pages/{old_page_pk}/"
        new_title = "Old Page With New Title"
        response = self.client.patch(detail_url, {"title": new_title})
        page = Page.objects.filter(pk=old_page_pk).first()
        self.assertEqual(page.pk, old_page_pk)
        self.assertNotEqual(page.title, old_page_title)
        self.assertEqual(page.title, new_title)

    def test_page_delete_deletes_page(self):
        page = self.pages[0]
        old_page_pk = page.pk
        detail_url = f"/api/v1/pages/{old_page_pk}/"
        response = self.client.delete(detail_url)

        pages = Page.objects.all()
        self.assertEqual(len(pages), self.page_count - 1)
        self.assertNotIn(old_page_pk, [p.pk for p in pages])

    def test_page_list_uses_list_serializer(self):
        list_url = reverse("page-list")
        response = self.client.get(list_url)
        # list serializer does not have 'styles' field
        self.assertNotIn("styles", response.json())

    def test_page_detail_uses_detail_serializer(self):
        page_pk = self.pages[0].pk
        response = self.client.get(f"/api/v1/pages/{page_pk}/")
        # detail serializer should have 'styles' field
        self.assertIn("styles", response.json())


class TemplateViewSetTest(APITestCase):
    def setUp(self):
        self.template_count = 5
        for i in range(self.template_count):
            TemplateFactory()

        self.templates = Template.objects.all()
        self.org = OrganizationFactory()

    def test_template_list_returns_results(self):
        list_url = reverse("template-list")
        response = self.client.get(list_url)
        templates = Template.objects.all()
        self.assertEqual(len(response.data), len(templates))

        template_titles = [p["title"] for p in response.data]
        expected_template_titles = [p.title for p in templates]
        self.assertEqual(template_titles, expected_template_titles)

    def test_template_create_adds_template(self):
        self.assertEqual(len(self.templates), self.template_count)
        list_url = reverse("template-list")
        response = self.client.post(
            list_url, {"name": "New Template", "title": "New Template", "organization": self.org.pk}
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Template.objects.count(), self.template_count + 1)

    def test_template_update_updates_template(self):
        template = self.templates[0]
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
        template = self.templates[0]
        old_template_pk = template.pk
        detail_url = f"/api/v1/templates/{old_template_pk}/"
        response = self.client.delete(detail_url)

        templates = Template.objects.all()
        self.assertEqual(len(templates), self.template_count - 1)
        self.assertNotIn(old_template_pk, [p.pk for p in templates])

    def test_template_list_uses_list_serializer(self):
        list_url = reverse("template-list")
        response = self.client.get(list_url)
        # list serializer does not have 'styles' field
        self.assertNotIn("styles", response.json())

    def test_template_detail_uses_detail_serializer(self):
        template_pk = self.templates[0].pk
        response = self.client.get(f"/api/v1/templates/{template_pk}/")
        # detail serializer should have 'styles' field
        self.assertIn("styles", response.json())


class DonorBenefitViewSetTest(APITestCase):
    def setUp(self):
        self.donor_benefit_count = 5
        for i in range(self.donor_benefit_count):
            DonorBenefitFactory()
        self.donor_benefits = DonorBenefit.objects.all()

    def test_donor_benefit_list_uses_list_serializer(self):
        response = self.client.get("/api/v1/donor-benefits/")
        # list serializer does not have 'tiers' field
        self.assertNotIn("tiers", response.json())

    def test_donor_benefit_detail_uses_detail_serializer(self):
        donor_benefit_pk = self.donor_benefits[0].pk
        response = self.client.get(f"/api/v1/donor-benefits/{donor_benefit_pk}/")
        # detail serializer should have 'tiers' field
        self.assertIn("tiers", response.json())
