import re

from django.template.loader import render_to_string

import pytest
from bs4 import BeautifulSoup as bs4


@pytest.fixture
def upgrade_confirmation_email_context():
    return {
        "mailchimp_integration_url": "some-url",
    }


EXPECTED_UPGRADE_HEADER_CTA = "Start enjoying your new features"
EXPECTED_UPGRADE_HTML_BUTTON_TEXT = "Connect to Mailchimp"


def test_upgrade_confirmation_email_text(upgrade_confirmation_email_context, settings):
    result = render_to_string("upgrade-confirmation.txt", upgrade_confirmation_email_context)
    assert upgrade_confirmation_email_context["mailchimp_integration_url"] in result
    assert EXPECTED_UPGRADE_HEADER_CTA in result


def test_upgrade_confirmation_email_html(upgrade_confirmation_email_context):
    soup = bs4(render_to_string("upgrade-confirmation.html", upgrade_confirmation_email_context), "html.parser")
    assert soup.find(lambda tag: re.compile(EXPECTED_UPGRADE_HEADER_CTA).match(tag.text))
    assert soup.find("a", string=re.compile(rf"{EXPECTED_UPGRADE_HTML_BUTTON_TEXT}"))
