from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.messages import get_messages
from django.test import RequestFactory, TestCase
from django.urls import reverse

from apps.common.tests.test_utils import setup_request
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.admin import DonationPageAdmin, TemplateAdmin
from apps.pages.models import DonationPage, Template
from apps.pages.tests.factories import DonationPageFactory


class DonationPageAdminTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        user_model = get_user_model()
        self.user = user_model.objects.create_superuser(email="test@test.com", password="testing")
        self.revenue_program = RevenueProgramFactory()
        self.page_admin = DonationPageAdmin(DonationPage, AdminSite())
        self.page = DonationPageFactory(name="My Test Page", revenue_program=self.revenue_program)
        self.change_url = reverse("admin:pages_donationpage_changelist")

    def test_make_template_from_page_success(self):
        request = self.factory.get(self.change_url)
        setup_request(self.user, request)
        prev_template_count = Template.objects.count()
        page_queryset = DonationPage.objects.filter(pk=self.page.pk)

        self.page_admin.make_template(request, page_queryset)

        new_templates = Template.objects.all()
        self.assertEqual(prev_template_count + 1, len(new_templates))

    def test_make_template_error_messages_when_duplicate_name(self):
        self.client.force_login(user=self.user)
        # Make template from target page once...
        Template.objects.create(name=self.page.name, organization=self.page.organization)
        # ...then try to make one by the same name (through admin action)
        response = self.client.post(self.change_url, {"action": "make_template", "_selected_action": [self.page.pk]})
        messages = [m.message for m in get_messages(response.wsgi_request)]
        self.assertEqual(messages, [f'Template name "{self.page.name}" already used in organization'])


class TemplateAdminTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        user_model = get_user_model()
        self.user = user_model.objects.create_superuser(email="test@test.com", password="testing")
        self.client.force_login(self.user)
        self.template_admin = TemplateAdmin(Template, AdminSite())
        self.original_page = DonationPageFactory(name="My Test Page")
        self.template = self.original_page.make_template_from_page()

    def _get_change_url(self, template_id):
        return reverse("admin:pages_template_change", kwargs={"object_id": template_id})

    def test_make_template_button_appears_in_change_form(self):
        change_url = self._get_change_url(self.template.id)
        response = self.client.get(change_url)
        self.assertContains(response, "Make page from this template")

    def test_new_page_is_created_from_template(self):
        request_body = {"_page-from-template": True}
        change_url = self._get_change_url(self.template.id)
        request = self.factory.post(change_url, request_body)
        setup_request(self.user, request)
        prev_page_count = DonationPage.objects.count()
        template = Template.objects.first()
        response = self.template_admin.response_change(request, template)

        new_pages = DonationPage.objects.all()
        self.assertNotEqual(prev_page_count, len(new_pages))

    def test_response_change_without_button_click_passes_through(self):
        change_url = self._get_change_url(self.template.id)
        request = self.factory.post(change_url)
        setup_request(self.user, request)
        template = Template.objects.first()
        response = self.template_admin.response_change(request, template)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(reverse("admin:pages_template_changelist"), response.url)

    def test_make_page_error_messages_when_duplicate_name(self):
        change_url = self._get_change_url(self.template.id)
        # Make page with target name once...
        self.client.post(change_url, {"_page-from-template": True})
        # ...then try to do it again
        response = self.client.post(change_url, {"_page-from-template": True})
        messages = [m.message for m in get_messages(response.wsgi_request)]
        self.assertEqual(
            messages,
            [
                f'Donation Page name "New Page From Template ({self.template.name})" already used in organization. Did you forget to update the name of a previous page created from this template?'
            ],
        )
