from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase
from django.urls import reverse

from apps.common.tests.test_utils import setup_request
from apps.pages.admin import DonationPageAdmin, TemplateAdmin
from apps.pages.models import DonationPage, Template
from apps.pages.tests.factories import DonationPageFactory, TemplateFactory


class DonationPageAdminTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        user_model = get_user_model()
        self.user = user_model.objects.create_superuser(email="test@test.com", password="testing")
        self.page_admin = DonationPageAdmin(DonationPage, AdminSite())
        self.page = DonationPageFactory()

    def test_make_template_from_page(self):
        request = self.factory.get(reverse("admin:pages_donationpage_changelist"))
        setup_request(self.user, request)
        prev_template_count = Template.objects.count()
        page_queryset = DonationPage.objects.all()

        self.page_admin.make_template(request, page_queryset)

        new_templates = Template.objects.all()
        self.assertEqual(prev_template_count + 1, len(new_templates))

        # New Template gets its name from previous page's title
        self.assertEqual(new_templates[0].name, self.page.title)

    def test_make_template_no_duplicate(self):
        request = self.factory.get(reverse("admin:pages_donationpage_changelist"))
        setup_request(self.user, request)
        prev_template_count = Template.objects.count()
        page_queryset = DonationPage.objects.all()

        self.page_admin.make_template(request, page_queryset)

        new_templates = Template.objects.all()
        self.assertNotEqual(prev_template_count, len(new_templates))

        # Run it again with same pages
        self.page_admin.make_template(request, page_queryset)
        last_templates_count = Template.objects.count()
        self.assertEqual(last_templates_count, len(new_templates))


class TemplateAdminTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        user_model = get_user_model()
        self.user = user_model.objects.create_superuser(email="test@test.com", password="testing")
        self.client.force_login(self.user)
        self.template_admin = TemplateAdmin(Template, AdminSite())
        self.template = TemplateFactory()

    def test_make_template_button_appears_in_change_form(self):
        change_url = reverse("admin:pages_template_change", kwargs={"object_id": self.template.id})
        response = self.client.get(change_url)
        self.assertContains(response, "Make page from this template")

    def test_new_page_is_created_from_template(self):
        request_body = {"_page-from-template": True}
        url = reverse("admin:pages_template_change", kwargs={"object_id": self.template.id})
        request = self.factory.post(url, request_body)
        setup_request(self.user, request)
        prev_page_count = DonationPage.objects.count()
        template = Template.objects.first()
        response = self.template_admin.response_change(request, template)

        new_pages = DonationPage.objects.all()
        self.assertNotEqual(prev_page_count, len(new_pages))

        # New page's title should be previous template's name
        self.assertEqual(new_pages[0].title, self.template.name)

    def test_response_change_without_button_click_passes_through(self):
        url = reverse("admin:pages_template_change", kwargs={"object_id": self.template.id})
        request = self.factory.post(url)
        setup_request(self.user, request)
        template = Template.objects.first()
        response = self.template_admin.response_change(request, template)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(reverse("admin:pages_template_changelist"), response.url)
