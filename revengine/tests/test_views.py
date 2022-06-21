import re

from django.urls import reverse

from bs4 import BeautifulSoup as bs4


support_address_for_500_pages = "support@fundjournalism.org"

expected_elements_by_kwargs = {
    "h1": {"string": re.compile("something went wrong", re.IGNORECASE)},
    "a": {"href": f"mailto:{support_address_for_500_pages}", "string": support_address_for_500_pages},
    "footer": {},
}


def test_heroku_500():
    """Test that the custom 500 page served by Heroku is as expected

    NB: This is a somewhat odd test in that it's not actually testing a view. As noted
    in the comment at the top of `500_heroku.html`, we will need to manually upload this
    static HTML file to GCS, and point Heroku to the resulting URL. Here, we just prove
    that insofar as this is the file we upload, it will display a message to the user and
    give them a support email address.
    """
    with open("revengine/templates/500_heroku.html") as fl:
        soup = bs4(fl, "html.parser")
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
