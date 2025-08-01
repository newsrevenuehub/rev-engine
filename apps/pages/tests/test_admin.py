import django.forms.models
from django.contrib.admin.sites import AdminSite
from django.contrib.messages import get_messages
from django.core.exceptions import ValidationError
from django.test import RequestFactory
from django.urls import reverse
from django.utils import timezone

import pytest
from bs4 import BeautifulSoup as bs4

from apps.organizations.models import CorePlan, FreePlan, Plans, PlusPlan
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.admin import DonationPageAdmin
from apps.pages.models import DonationPage
from apps.pages.tests.factories import DonationPageFactory


def make_valid_page_data(**kwargs):
    return (
        dict.fromkeys(
            [
                "revenue_program",
                "csrfmiddlewaretoken",
                "published_date_0",
                "published_date_1",
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
                "initial-sidebar_elements",
                "_save",
            ],
            "",
        )
        | {"slug": "something-great", "name": "something great", "sidebar_elements": "[]", "elements": "[]"}
        | kwargs
    )


@pytest.mark.django_db
class TestDonationPageAdmin:
    def test_get_form(self, live_donation_page):
        request = RequestFactory().get(reverse("admin:pages_donationpage_changelist"))
        admin = DonationPageAdmin(DonationPage, AdminSite())
        assert issubclass(admin.get_form(request), django.forms.models.ModelForm)
        assert issubclass(admin.get_form(request, obj=live_donation_page), django.forms.models.ModelForm)

    @pytest.mark.parametrize("plan", [FreePlan, CorePlan, PlusPlan])
    def test_thank_you_redirect_when_not_allowed_by_org_plan(self, plan, admin_client):
        rp = RevenueProgramFactory(organization__plan_name=plan.name)
        query = DonationPage.objects.filter(revenue_program__organization=rp.organization)
        before_count = query.count()
        assert before_count == 0
        data = make_valid_page_data(
            revenue_program=str(rp.id), thank_you_redirect=(redirect := "https://www.somewhere.com")
        )
        response = admin_client.post(reverse("admin:pages_donationpage_add"), data)
        assert response.status_code == 200 if not plan.custom_thank_you_page_enabled else 302
        if plan.custom_thank_you_page_enabled:
            assert query.count() == before_count + 1
            assert DonationPage.objects.first().thank_you_redirect == redirect
        else:
            soup = bs4(response.content, "html.parser")
            org = rp.organization
            expected = f"The parent org (ID: {org.id} | Name: {org.name}) is on the {org.plan.label} plan, which does not get this feature"
            assert soup.body.find(text=lambda t: expected in t.text)

    @pytest.mark.parametrize("plan", [FreePlan, CorePlan, PlusPlan])
    def test_add_page_when_already_at_plan_limit(self, plan, admin_client):
        rp = RevenueProgramFactory(organization__plan_name=plan.name)
        DonationPageFactory.create_batch(plan.page_limit, revenue_program=rp)
        url = reverse("admin:pages_donationpage_add")
        data = make_valid_page_data(revenue_program=rp.id)
        response = admin_client.post(url, data)
        assert response.status_code == 200
        soup = bs4(response.content, "html.parser")
        expected = (
            f"The parent org (ID: {rp.organization.id} | Name: {rp.organization.name}) is on the {rp.organization.plan.label} "
            f"plan, and is limited to {rp.organization.plan.page_limit} page"
        )

        def expected_in_soup(item):
            return soup.body.find(text=lambda t: expected in item.text)

        assert soup.body.find(string=expected_in_soup)

    def test_add_published_page_when_already_at_publish_limit(self, admin_client):
        rp = RevenueProgramFactory(organization__plan_name=Plans.FREE)
        DonationPageFactory.create_batch(
            rp.organization.plan.publish_limit, published_date=timezone.now(), revenue_program=rp
        )
        url = reverse("admin:pages_donationpage_add")
        data = make_valid_page_data(revenue_program=rp.id, published_date_0="2020-01-01", published_date_1="00:00:00")
        response = admin_client.post(url, data)
        assert response.status_code == 200
        soup = bs4(response.content, "html.parser")
        org = rp.organization
        expected = (
            f"The parent org (ID: {org.id} | Name: {org.name}) is on the {org.plan.label} "
            f"plan, and is limited to {org.plan.publish_limit} published page{'' if org.plan.publish_limit == 1 else 's'}."
        )
        assert soup.body.find("li", text=expected)

    def test_can_modify_donation_page_when_sidebar_elements_is_empty(self, admin_client):
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

    def test_duplicate_page(self, admin_client, donation_page):
        response = admin_client.post(
            reverse("admin:pages_donationpage_changelist"),
            {
                "action": "duplicate_selected",
                "_selected_action": [donation_page.id],
            },
            follow=True,
        )
        assert response.status_code == 200
        duplicates = DonationPage.objects.filter(
            revenue_program=donation_page.revenue_program, name__startswith=donation_page.name
        ).exclude(id=donation_page.id)
        assert duplicates.count() == 1
        messages = list(get_messages(response.wsgi_request))
        assert len(messages) == 1
        assert "1 page duplicated successfully" in str(messages[0])

    def test_duplicate_page_validation_error(self, admin_client, donation_page, mocker):
        mocker.patch(
            "apps.pages.models.DonationPage.duplicate",
            side_effect=ValidationError("test error"),
        )
        response = admin_client.post(
            reverse("admin:pages_donationpage_changelist"),
            {
                "action": "duplicate_selected",
                "_selected_action": [donation_page.id],
            },
            follow=True,
        )
        assert response.status_code == 200
        messages = list(get_messages(response.wsgi_request))
        assert any("Could not duplicate page" in str(message) for message in messages)
