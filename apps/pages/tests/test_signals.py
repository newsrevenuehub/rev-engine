import json
from unittest.mock import MagicMock, patch

import pytest

from apps.google_cloud.pubsub import Message
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.signals import donation_page_page_published_handler
from apps.pages.tests.factories import DonationPageFactory


PAGE_TOPIC = "page-topic"


@pytest.mark.parametrize(
    ("gcloud_configured", "topic"),
    [
        (False, None),
        (True, None),
        (False, PAGE_TOPIC),
        (True, PAGE_TOPIC),
    ],
)
@patch("apps.pages.signals.Publisher")
@pytest.mark.django_db()
def test_donation_page_page_published_handler(publisher, gcloud_configured, topic, monkeypatch):
    monkeypatch.setattr("apps.pages.signals.settings.PAGE_PUBLISHED_TOPIC", topic)
    publisher_instance = MagicMock()
    publisher.get_instance.return_value = publisher_instance
    page_instance = DonationPageFactory(revenue_program=RevenueProgramFactory())
    with patch("apps.pages.signals.google_cloud_pub_sub_is_configured") as gcloud_configured_util:
        gcloud_configured_util.return_value = gcloud_configured
        donation_page_page_published_handler(MagicMock(), instance=page_instance)
        if not gcloud_configured or not topic:
            assert not publisher_instance.publish.called
        else:
            expected_payload = {
                "page_id": page_instance.pk,
                "url": page_instance.page_url,
                "publication_date": str(page_instance.published_date),
                "revenue_program_id": page_instance.revenue_program.pk,
                "revenue_program_name": page_instance.revenue_program.name,
                "revenue_program_slug": page_instance.revenue_program.slug,
            }
            publisher_instance.publish.assert_called_with(topic, Message(data=json.dumps(expected_payload)))
