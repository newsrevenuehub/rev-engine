from django.contrib import messages
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory, override_settings
from django.urls import reverse
from django.utils import timezone

import pytest
from bs4 import BeautifulSoup
from bs4 import BeautifulSoup as bs4

from apps.organizations.admin import OrganizationAdmin, PaymentProviderAdmin
from apps.organizations.models import FreePlan, Organization
from apps.organizations.tests.factories import (
    BenefitLevelFactory,
    OrganizationFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
)
from apps.pages.tests.factories import DonationPageFactory

from ..models import PaymentProvider


pytestmark = pytest.mark.django_db

boolean_types = [1, 0, "t", "f"]


def test_revenue_program_default_donation_page_options_limited(admin_client):
    my_revenue_program = RevenueProgramFactory(onboarded=True)
    some_other_rp = RevenueProgramFactory(onboarded=True)
    dp1 = DonationPageFactory(revenue_program=my_revenue_program)
    dp2 = DonationPageFactory(revenue_program=my_revenue_program)
    dp3 = DonationPageFactory(revenue_program=some_other_rp)
    response = admin_client.get(reverse("admin:organizations_revenueprogram_change", args=[my_revenue_program.pk]))
    assert response.status_code == 200
    soup = bs4(response.content)

    select = soup.find("select", {"name": "default_donation_page"})
    assert str(dp1.pk) in str(select)
    assert str(dp2.pk) in str(select)
    assert str(dp3.pk) not in str(select)


def test_revenue_program_change_list_existing_benefit_levels(admin_client):
    my_revenue_program = RevenueProgramFactory()
    my_benefit_level = BenefitLevelFactory(revenue_program=my_revenue_program)
    response = admin_client.get(reverse("admin:organizations_revenueprogram_change", args=[my_revenue_program.pk]))
    soup = bs4(response.content)
    benefit_level_id = soup.find("input", {"name": "benefitlevel_set-0-id"}).attrs["value"]
    assert my_benefit_level.pk == int(benefit_level_id)


def test_benefitlevel_change_has_level_attribute_populated(admin_client):
    my_revenue_program = RevenueProgramFactory()
    my_benefit_level = BenefitLevelFactory(revenue_program=my_revenue_program)
    response = admin_client.get(reverse("admin:organizations_benefitlevel_change", args=[my_benefit_level.pk]))
    soup = bs4(response.content)
    assert int(soup.find("input", {"name": "level"}).attrs["value"]) == 1


def test_benefitlevel_change_where_revenue_program_is_readonly(admin_client):
    my_revenue_program = RevenueProgramFactory()
    my_benefit_level = BenefitLevelFactory(revenue_program=my_revenue_program)
    response = admin_client.get(reverse("admin:organizations_benefitlevel_change", args=[my_benefit_level.pk]))
    soup = bs4(response.content)
    assert my_revenue_program.name == soup.select_one(".field-revenue_program .readonly a").text


@override_settings(MESSAGE_STORAGE="django.contrib.messages.storage.cookie.CookieStorage")
def test_paymentprovider_change_blocks_deletion_when_pages_with_publish_date():
    provider = PaymentProviderFactory()
    model_admin = PaymentProviderAdmin(model=PaymentProvider, admin_site=AdminSite())

    request = RequestFactory().get("/")
    request._messages = messages.storage.default_storage(request)
    assert model_admin.has_delete_permission(request, provider) is True

    DonationPageFactory(revenue_program=RevenueProgramFactory(payment_provider=provider), published_date=timezone.now())

    assert model_admin.has_delete_permission(request, provider) is False

    message = request._messages._queued_messages[0].message

    assert message == (
        f"Can't delete this payment provider because it's used by 1 live or future live contribution page "
        f"across <a href=/nrhadmin/organizations/revenueprogram/?q={provider.stripe_account_id}>1 revenue program</a>."
    )


def test_revenue_program_list_payment_provider_url_exists(admin_client):
    """Payment Provider column exists in Revenue Program list display with link to the Payment Provider admin page."""
    revenue_program = RevenueProgramFactory()
    response = admin_client.get(reverse("admin:organizations_revenueprogram_changelist"))
    soup = bs4(response.content)
    expected_url = f"/nrhadmin/organizations/paymentprovider/{revenue_program.payment_provider_id}/change/"
    actual_url = soup.select_one(".field-payment_provider_url a").attrs["href"]
    assert expected_url == actual_url


def test_payment_provider_list_revenue_program_exists(admin_client):
    """Revenue Programs column exists in Payment Provider list display with comma-separated."""
    payment_provider = PaymentProviderFactory()
    revenue_program_1 = RevenueProgramFactory(payment_provider=payment_provider)
    revenue_program_2 = RevenueProgramFactory(payment_provider=payment_provider)
    response = admin_client.get(reverse("admin:organizations_paymentprovider_changelist"))
    soup = bs4(response.content)
    actual_rps = soup.select_one(".field-revenue_programs").text
    assert revenue_program_1.name in actual_rps
    assert revenue_program_2.name in actual_rps


def test_show_expected_fields_on_organization_pages(admin_client):
    # add page
    response = admin_client.get(reverse("admin:organizations_organization_add"))
    soup = BeautifulSoup(response.content)
    assert soup.find("input", {"name": "show_connected_to_slack"}) is not None
    assert soup.find("input", {"name": "show_connected_to_salesforce"}) is not None
    assert soup.find("input", {"name": "show_connected_to_mailchimp"}) is not None
    # change page
    org = OrganizationFactory()
    response = admin_client.get(f"/nrhadmin/organizations/organization/{org.id}/change/")
    soup = BeautifulSoup(response.content)
    assert soup.find("input", {"name": "show_connected_to_slack"}) is not None
    assert soup.find("input", {"name": "show_connected_to_salesforce"}) is not None
    assert soup.find("input", {"name": "show_connected_to_mailchimp"}) is not None


def test_revenue_program_tax_id_available_in_admin_page(admin_client):
    response = admin_client.get(reverse("admin:organizations_revenueprogram_add"))
    soup = bs4(response.content)
    assert soup.find("input", {"name": "tax_id"}) is not None

    my_revenue_program = RevenueProgramFactory()
    response = admin_client.get(reverse("admin:organizations_revenueprogram_change", args=[my_revenue_program.pk]))
    soup = bs4(response.content)
    assert soup.find("input", {"name": "tax_id"}) is not None


def test_show_expected_fields_on_rp_pages(admin_client):
    for response in [
        admin_client.get(reverse("admin:organizations_revenueprogram_add")),
        admin_client.get(f"/nrhadmin/organizations/revenueprogram/{RevenueProgramFactory().id}/change/"),
    ]:
        soup = BeautifulSoup(response.content)
        assert soup.select_one(".field-name") is not None
        assert soup.select_one(".field-slug") is not None
        assert soup.find("input", {"name": "contact_email"}) is not None
        assert soup.find("input", {"name": "contact_phone"}) is not None
        assert soup.select_one(".field-organization") is not None
        assert soup.select_one(".field-default_donation_page") is not None
        assert soup.select_one(".field-country") is not None
        assert soup.find("input", {"name": "fiscal_sponsor_name"}) is not None
        assert soup.select_one(".field-fiscal_status") is not None
        assert soup.find("input", {"name": "stripe_statement_descriptor_suffix"}) is not None
        assert soup.find("input", {"name": "domain_apple_verified_date_0"}) is not None
        assert soup.find("input", {"name": "domain_apple_verified_date_1"}) is not None
        assert soup.select_one(".field-payment_provider") is not None
        assert soup.find("input", {"name": "google_analytics_v3_domain"}) is not None
        assert soup.find("input", {"name": "google_analytics_v3_id"}) is not None
        assert soup.find("input", {"name": "google_analytics_v4_id"}) is not None
        assert soup.find("input", {"name": "facebook_pixel_id"}) is not None
        assert soup.find("input", {"name": "twitter_handle"})
        assert soup.find("input", {"name": "website_url"})
        assert soup.find("input", {"name": "allow_offer_nyt_comp"})


@pytest.mark.django_db()
class TestOrganizationAdmin:
    @pytest.fixture()
    def model_admin(self):
        return OrganizationAdmin(Organization, AdminSite())

    @pytest.fixture()
    def slug_change_for_existing(self, organization_on_core_plan_with_mailchimp_set_up):
        return {
            "name": organization_on_core_plan_with_mailchimp_set_up.name,
            "plan_name": organization_on_core_plan_with_mailchimp_set_up.plan_name,
            "send_receipt_email_via_nre": organization_on_core_plan_with_mailchimp_set_up.send_receipt_email_via_nre,
            "slug": "new-slug",
        }

    @pytest.fixture()
    def no_changes_for_existing(self, organization_on_core_plan_with_mailchimp_set_up):
        return {
            "name": organization_on_core_plan_with_mailchimp_set_up.name,
            "plan_name": organization_on_core_plan_with_mailchimp_set_up.plan_name,
            "send_receipt_email_via_nre": organization_on_core_plan_with_mailchimp_set_up.send_receipt_email_via_nre,
            "slug": organization_on_core_plan_with_mailchimp_set_up.slug,
        }

    @pytest.fixture()
    def new_data(self):
        return {
            "name": "some name",
            "plan_name": FreePlan.name,
            "send_receipt_email_via_nre": True,
            "slug": "some-slug",
        }

    @pytest.fixture(
        params=[
            ("new_data", False, None),
            ("slug_change_for_existing", True, {"slug", "modified"}),
            ("no_changes_for_existing", True, None),
        ]
    )
    def test_save_model_cases(self, request):
        return request.getfixturevalue(request.param[0]), request.param[1], request.param[2]

    def test_save_model(
        self,
        superuser,
        client,
        test_save_model_cases,
        organization_on_core_plan_with_mailchimp_set_up,
        mocker,
    ):
        data, change_existing, expected_update_fields = test_save_model_cases
        save_spy = mocker.patch("apps.organizations.models.Organization.save")
        client.force_login(superuser)
        url = (
            reverse(
                "admin:organizations_organization_change", args=(organization_on_core_plan_with_mailchimp_set_up.id,)
            )
            if change_existing
            else reverse("admin:organizations_organization_add")
        )
        response = client.post(url, data=data, follow=True)
        assert response.status_code == 200
        if change_existing and expected_update_fields:
            save_spy.assert_called_once_with(update_fields=expected_update_fields)
        else:
            save_spy.assert_called_once_with()
