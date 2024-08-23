import re

from django.conf import settings
from django.template.loader import render_to_string

import pytest
from bs4 import BeautifulSoup as bs4


@pytest.fixture
def upgrade_confirmation_email_context():
    return {
        "mailchimp_integration_url": "some-url",
        "logo_url": f"{settings.SITE_URL}/static/nre_logo_black_yellow.png",
        "plus_icon": f"{settings.SITE_URL}/static/plus-icon.png",
        "mail_icon": f"{settings.SITE_URL}/static/mail-icon.png",
        "paint_icon": f"{settings.SITE_URL}/static/paint-icon.png",
        "check_icon": f"{settings.SITE_URL}/static/check-icon.png",
    }


EXPECTED_UPGRADE_HEADER_CTA = "Start enjoying your new features"
EXPECTED_UPGRADE_HTML_BUTTON_TEXT = "Connect to Mailchimp"


def test_upgrade_confirmation_email_text(upgrade_confirmation_email_context, settings):
    result = render_to_string("upgrade-confirmation.txt", upgrade_confirmation_email_context)
    assert upgrade_confirmation_email_context["mailchimp_integration_url"] in result
    assert EXPECTED_UPGRADE_HEADER_CTA in result


def test_upgrade_confirmation_email_html(upgrade_confirmation_email_context):
    logo_url = f"{settings.SITE_URL}/static/nre_logo_black_yellow.png"
    plus_icon = f"{settings.SITE_URL}/static/plus-icon.png"
    mail_icon = f"{settings.SITE_URL}/static/mail-icon.png"
    paint_icon = f"{settings.SITE_URL}/static/paint-icon.png"
    check_icon = f"{settings.SITE_URL}/static/check-icon.png"

    rendered_email = render_to_string("upgrade-confirmation.html", upgrade_confirmation_email_context)
    soup = bs4(render_to_string("upgrade-confirmation.html", upgrade_confirmation_email_context), "html.parser")
    assert soup.find(lambda tag: re.compile(EXPECTED_UPGRADE_HEADER_CTA).match(tag.text))
    assert soup.find("a", string=re.compile(rf"{EXPECTED_UPGRADE_HTML_BUTTON_TEXT}"))
    assert 'src="' + logo_url + '"' in rendered_email
    assert 'src="' + plus_icon + '"' in rendered_email
    assert 'src="' + mail_icon + '"' in rendered_email
    assert 'src="' + paint_icon + '"' in rendered_email
    assert 'src="' + check_icon + '"' in rendered_email
