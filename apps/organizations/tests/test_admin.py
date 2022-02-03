from django.urls import reverse

import pytest
from bs4 import BeautifulSoup as bs4

from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.tests.factories import DonationPageFactory

from ..models import Feature


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
