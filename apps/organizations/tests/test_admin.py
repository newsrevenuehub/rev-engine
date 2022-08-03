from django.contrib import messages
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory, override_settings
from django.urls import reverse
from django.utils import timezone

import pytest
from bs4 import BeautifulSoup as bs4

from apps.organizations.admin import PaymentProviderAdmin
from apps.organizations.tests.factories import (
    BenefitLevelFactory,
    PaymentProviderFactory,
    RevenueProgramFactory,
)
from apps.pages.tests.factories import DonationPageFactory

from ..models import Feature, PaymentProvider


pytestmark = pytest.mark.django_db

boolean_types = [1, 0, "t", "f"]

feature = {
    "name": "A feature",
    "feature_type": f"{Feature.FeatureType.BOOLEAN.value}",
    "feature_value": "t",
    "description": "A description",
}


def test_feature_add_boolean(admin_client):
    assert Feature.objects.all().count() == 0
    for t in boolean_types:
        feature["feature_value"] = t

        response = admin_client.post(reverse("admin:organizations_feature_add"), feature)
        assert response.status_code == 302
    assert Feature.objects.all().count() == 4


def test_feature_add_limit(admin_client):
    feature["feature_type"] = Feature.FeatureType.PAGE_LIMIT.value
    feature["feature_value"] = 3
    assert Feature.objects.all().count() == 0
    response = admin_client.post(reverse("admin:organizations_feature_add"), feature)
    assert response.status_code == 302
    assert Feature.objects.all().count() == 1


def test_feature_add_boolean_fail(admin_client):
    assert Feature.objects.all().count() == 0
    feature["feature_value"] = "z"
    response = admin_client.post(reverse("admin:organizations_feature_add"), feature)
    assert response.status_code == 200
    assert Feature.objects.all().count() == 0
    soup = bs4(response.content)
    assert soup.find(class_="errorlist nonfield")


def test_feature_add_limit_fail(admin_client):
    invalid_limits = [-1, "k", -100, 0]
    assert Feature.objects.all().count() == 0
    feature["feature_type"] = Feature.FeatureType.PAGE_LIMIT.value
    for il in invalid_limits:
        feature["feature_value"] = il
        response = admin_client.post(reverse("admin:organizations_feature_add"), feature)
        assert response.status_code == 200
        soup = bs4(response.content)
        assert soup.find(class_="errorlist nonfield")
    assert Feature.objects.all().count() == 0


def test_revenue_program_default_donation_page_options_limited(admin_client):
    my_revenue_program = RevenueProgramFactory()
    some_other_rp = RevenueProgramFactory()
    dp1 = DonationPageFactory(revenue_program=my_revenue_program)
    dp2 = DonationPageFactory(revenue_program=my_revenue_program)
    dp3 = DonationPageFactory(revenue_program=some_other_rp)

    response = admin_client.get(reverse("admin:organizations_revenueprogram_change", args=[my_revenue_program.pk]))
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
        f"Can't delete this payment provider because it's used by 1 live or future live donation page "
        f"across <a href=/nrhadmin/organizations/revenueprogram/?q={provider.stripe_account_id}>1 revenue program</a>."
    )
