import re

from django.urls import reverse

from bs4 import BeautifulSoup as bs4


support_address_for_500_pages = "support@fundjournalism.org"

expected_elements_by_kwargs = {
    "h1": {"string": re.compile("something went wrong", re.IGNORECASE)},
    "a": {"href": f"mailto:{support_address_for_500_pages}", "string": support_address_for_500_pages},
    "footer": {},
}


def test_custom_500(client):
    """Test that custom 500 page is as expected"""
    client.raise_request_exception = False
    response = client.get(reverse("dummy-500"))
    assert response.status_code == 500
    soup = bs4(response.content, "html.parser")
    for elem, kwargs in expected_elements_by_kwargs.items():
        assert soup.find(elem, **kwargs)


def test_cloudflare_500_page(client):
    """Test that the custom 500 page we expose to Cloudflare is as expected"""
    response = client.get(reverse("cloudflare-500"))
    assert response.status_code == 200
    expectations = expected_elements_by_kwargs | {
        "h2": {"class": "error-trace", "string": "::CLOUDFLARE_ERROR_500S_BOX::"}
    }
    soup = bs4(response.content, "html.parser")
    for elem, kwargs in expectations.items():
        assert soup.find(elem, **kwargs)
    cloudflare_errors_div = soup.find("div", {"id": "cloudflare-error-data", "class": "hidden"})
    assert cloudflare_errors_div
    assert cloudflare_errors_div.findChild("div", string="::RAY_ID::")
    assert cloudflare_errors_div.findChild("div", string="::CLIENT_IP::")
