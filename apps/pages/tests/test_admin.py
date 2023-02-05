from unittest import mock

import django.forms.models
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.messages import get_messages
from django.db.utils import IntegrityError
from django.test import Client, RequestFactory, TestCase
from django.urls import reverse

import pytest
from bs4 import BeautifulSoup as bs4

from apps.common.tests.test_resources import AbstractTestCase
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
        Template.objects.create(name=self.page.name, revenue_program=self.revenue_program)
        # ...then try to make one by the same name (through admin action)
        response = self.client.post(self.change_url, {"action": "make_template", "_selected_action": [self.page.pk]})
        messages = [m.message for m in get_messages(response.wsgi_request)]
        self.assertEqual(messages, [f'Template name "{self.page.name}" already used in organization'])

    def test_make_template_other_integrityerror_raises(self):
        request = self.factory.get(self.change_url)
        setup_request(self.user, request)
        mock_page = mock.Mock()
        mock_page.make_template_from_page = mock.Mock(side_effect=IntegrityError("woopsie"))
        queryset = [
            mock_page,
        ]
        with pytest.raises(IntegrityError) as e:
            self.page_admin.make_template(request, queryset)
            assert str(e.value) == "woopsie"

    def test_get_form(self):
        request = self.factory.get(self.change_url)
        assert issubclass(self.page_admin.get_form(request), django.forms.models.ModelForm)
        assert issubclass(self.page_admin.get_form(request, obj=self.page), django.forms.models.ModelForm)

    def test_thank_you_redirect_when_not_allowed_by_org_plan(self):
        url = reverse("admin:pages_donationpage_add")
        # so we aren't hitting the page limit which would otherwise block us from creating an additional page
        # here
        DonationPage.objects.filter(revenue_program__organization=self.revenue_program.organization).delete()
        c = Client()
        c.force_login(self.user)
        data = dict.fromkeys(
            [
                "csrfmiddlewaretoken",
                "published_date_0",
                "published_date_1",
                "slug",
                "name",
                "post_thank_you_redirect",
                "header_bg_image",
                "header_logo",
                "header_link",
                "heading",
                "graphic",
                "styles",
                "elements",
                "initial-elements",
                "sidebar_elements",
                "initial-sidebar_elements",
                "_save",
            ],
            "",
        )
        data["revenue_program"] = self.revenue_program.id
        data["thank_you_redirect"] = "https://www.somewhere.com"
        response = c.post(url, data)
        assert response.status_code == 200
        soup = bs4(response.content, "html.parser")
        org = self.revenue_program.organization
        expected = (
            f"The parent org (ID: {org.id} | Name: {org.name}) is on the {org.plan.label} "
            f"plan, which does not get this feature"
        )
        assert soup.body.find(text=lambda t: expected in t.text)

    def test_add_page_when_already_at_plan_limit(self):
        url = reverse("admin:pages_donationpage_add")
        c = Client()
        c.force_login(self.user)
        data = dict.fromkeys(
            [
                "csrfmiddlewaretoken",
                "published_date_0",
                "published_date_1",
                "slug",
                "name",
                "thank_you_redirect",
                "post_thank_you_redirect",
                "header_bg_image",
                "header_logo",
                "header_link",
                "heading",
                "graphic",
                "styles",
                "elements",
                "initial-elements",
                "sidebar_elements",
                "initial-sidebar_elements",
                "_save",
            ],
            "",
        )
        data["revenue_program"] = self.revenue_program.id
        response = c.post(url, data)
        assert response.status_code == 200
        soup = bs4(response.content, "html.parser")
        org = self.revenue_program.organization
        expected = (
            f"The parent org (ID: {org.id} | Name: {org.name}) is on the {org.plan.label} "
            f"plan, and is limited to {org.plan.page_limit} page"
        )

        def expected_in_soup(item):
            return soup.body.find(text=lambda t: expected in item.text)

        assert soup.body.find(string=expected_in_soup)


class TemplateAdminTest(AbstractTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.set_up_domain_model()
        user_model = get_user_model()
        self.user = user_model.objects.create_superuser(email="superuser@test.com", password="testing")
        self.client.force_login(self.user)
        self.template_admin = TemplateAdmin(Template, AdminSite())
        self.revenue_program = self.org1_rp1
        self.original_page = self.org1_rp1.donationpage_set.first()
        self.template = self.original_page.make_template_from_page(from_admin=True)

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
        self.template_admin.response_change(request, self.template)
        new_pages = DonationPage.objects.all()
        self.assertNotEqual(prev_page_count, len(new_pages))

    def test_response_change_other_integrityerror_raises(self):
        request_body = {"_page-from-template": True}
        change_url = self._get_change_url(self.template.id)
        request = self.factory.post(change_url, request_body)
        setup_request(self.user, request)
        mock_obj = mock.Mock()
        mock_obj.make_page_from_template = mock.Mock(side_effect=IntegrityError("woopsie"))
        with pytest.raises(IntegrityError) as e:
            self.template_admin.response_change(request, mock_obj)
            assert str(e.value) == "woopsie"

    def test_response_change_without_button_click_passes_through(self):
        change_url = self._get_change_url(self.template.id)
        request = self.factory.post(change_url)
        setup_request(self.user, request)
        response = self.template_admin.response_change(request, self.template)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(reverse("admin:pages_template_changelist"), response.url)

    def test_make_page_allows_duplicate_name(self):
        change_url = self._get_change_url(self.template.id)
        # Make page with target name once...
        self.client.post(change_url, {"_page-from-template": True})
        # ...then try to do it again
        response = self.client.post(change_url, {"_page-from-template": True})
        self.assertEqual(response.status_code, 302)


@pytest.mark.django_db
def test_can_modify_donation_page_when_sidebar_elements_is_empty():
    user_model = get_user_model()
    user = user_model.objects.create_superuser(email="superuser@test.com", password="testing")
    page_empty_sidebar_elements = DonationPageFactory(sidebar_elements=[])
    url = reverse("admin:pages_donationpage_change", kwargs={"object_id": page_empty_sidebar_elements.id})
    c = Client()
    c.force_login(user)
    response = c.patch(url, data={"Name": "New name"})
    assert response.status_code == 200
