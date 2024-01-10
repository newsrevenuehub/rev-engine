from unittest import mock

from django.test import RequestFactory
from django.urls import reverse

import pytest
from bs4 import BeautifulSoup as bs4

from apps.common.models import SocialMeta
from apps.organizations.models import RevenueProgram
from apps.organizations.tests.factories import RevenueProgramFactory
from revengine.views import ReactAppView


@mock.patch("revengine.views.logger.info")
def test_spa_revenue_program_does_not_exist(logger_info, client):
    with (
        mock.patch("revengine.views.get_subdomain_from_request", return_value="nogood_subdomain"),
        mock.patch("revengine.views.RevenueProgram.objects.get", side_effect=RevenueProgram.DoesNotExist),
    ):
        response = client.get(reverse("index"))
        # ReactAppView._get_revenue_program_from_subdomain() just logs.
        assert logger_info.was_called
        assert response.status_code == 200


def test_read_apple_developer_merchant_id(client):
    with mock.patch("revengine.views.open", mock.mock_open(read_data="squeeeee!")):
        response = client.get(reverse("apple_dev_merchantid_domain"))
        assert response.status_code == 200


def _assert_500_page(soup):
    support_address_for_500_pages = "support@fundjournalism.org"
    assert "something went wrong" in soup.find("h1").text.lower()
    assert support_address_for_500_pages in soup.find("a", href=f"mailto:{support_address_for_500_pages}").text
    assert "news revenue hub" in soup.find("footer").text.lower()


def test_custom_500(client):
    """Test that custom 500 page is as expected"""
    client.raise_request_exception = True
    response = client.get(reverse("dummy-500"))
    assert response.status_code == 500
    _assert_500_page(bs4(response.content, "html.parser"))


def test_cloudflare_500_page(client):
    """Test that the custom 500 page we expose to Cloudflare is as expected"""
    response = client.get(reverse("cloudflare-500"))
    assert response.status_code == 200
    soup = bs4(response.content, "html.parser")
    _assert_500_page(soup)
    cloudflare_errors_div = soup.find("div", {"id": "cloudflare-error-data", "class": "hidden"})
    assert cloudflare_errors_div
    assert cloudflare_errors_div.findChild("div", string="::RAY_ID::")
    assert cloudflare_errors_div.findChild("div", string="::CLIENT_IP::")


@pytest.mark.django_db()
def test_react_app_view_get_context_data_with_social_meta(mocker):
    """Show that react app view works with social meta"""
    """ - RP without Social Meta is no longer possible as Social Meta is created automatically in RP's post_save - """
    rp_sans_socialmeta = RevenueProgramFactory()
    assert SocialMeta.objects.filter(revenue_program=rp_sans_socialmeta).exists()
    factory = RequestFactory()
    request = factory.get("/")
    mocker.patch.object(ReactAppView, "_get_revenue_program_from_subdomain", return_value=rp_sans_socialmeta)
    response = ReactAppView.as_view()(request)
    assert response.status_code == 200
