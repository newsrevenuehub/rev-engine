import django.forms.models
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import Client, RequestFactory, TestCase
from django.urls import reverse

import pytest
from bs4 import BeautifulSoup as bs4

from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.admin import DonationPageAdmin
from apps.pages.models import DonationPage
from apps.pages.tests.factories import DonationPageFactory


class DonationPageAdminTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        user_model = get_user_model()
        self.user = user_model.objects.create_superuser(email="test@test.com", password="testing")
        self.revenue_program = RevenueProgramFactory(organization__plan_name="FREE")
        self.page_admin = DonationPageAdmin(DonationPage, AdminSite())
        self.page = DonationPageFactory(name="My Test Page", revenue_program=self.revenue_program)
        self.change_url = reverse("admin:pages_donationpage_changelist")

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
        remaining = (
            self.revenue_program.organization.plan.page_limit
            - DonationPage.objects.filter(revenue_program=self.revenue_program).count()
        )
        if remaining:
            DonationPageFactory.create_batch(remaining, revenue_program=self.revenue_program)
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


@pytest.mark.django_db
def test_can_modify_donation_page_when_sidebar_elements_is_empty(admin_client):
    page_empty_sidebar_elements = DonationPageFactory(sidebar_elements=[])
    admin_client.post(
        reverse("admin:pages_donationpage_change", args=[page_empty_sidebar_elements.pk]),
        data=dict.fromkeys(
            [
                "csrfmiddlewaretoken",
                "published_date_0",
                "published_date_1",
                "slug",
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
                "initial-sidebar_elements",
                "_save",
            ],
            "",
        )
        | {
            "revenue_program": page_empty_sidebar_elements.revenue_program.id,
            "sidebar_elements": "[]",
            "name": (new_name := "New name"),
        },
    )
    page_empty_sidebar_elements.refresh_from_db()
    assert page_empty_sidebar_elements.name == new_name
