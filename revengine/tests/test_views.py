from django.urls import reverse

from bs4 import BeautifulSoup as bs4


def assert_500_page(soup):
    support_address_for_500_pages = "support@fundjournalism.org"
    assert "something went wrong" in soup.find("h1").text.lower()
    assert support_address_for_500_pages in soup.find("a", href=f"mailto:{support_address_for_500_pages}").text
    assert "news revenue hub" in soup.find("footer").text.lower()


def test_custom_500(client):
    """Test that custom 500 page is as expected"""
    client.raise_request_exception = True
    response = client.get(reverse("dummy-500"))
    assert response.status_code == 500
    assert_500_page(bs4(response.content, "html.parser"))


def test_cloudflare_500_page(client):
    """Test that the custom 500 page we expose to Cloudflare is as expected"""
    response = client.get(reverse("cloudflare-500"))
    assert response.status_code == 200
    soup = bs4(response.content, "html.parser")
    assert_500_page(soup)
    cloudflare_errors_div = soup.find("div", {"id": "cloudflare-error-data", "class": "hidden"})
    assert cloudflare_errors_div
    assert cloudflare_errors_div.findChild("div", string="::RAY_ID::")
    assert cloudflare_errors_div.findChild("div", string="::CLIENT_IP::")
