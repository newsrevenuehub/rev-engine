import json

import pytest

from apps.google_cloud.pubsub import Message
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.signals import donation_page_page_published_handler
from apps.pages.signals import settings as signals_settings
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
@pytest.mark.django_db
def test_donation_page_page_published_handler(gcloud_configured, topic, mocker):
    mocker.patch.object(signals_settings, "PAGE_PUBLISHED_TOPIC", topic)
    publish_handler = mocker.patch("apps.pages.signals.Publisher.get_instance")
    publish_handler.return_value = mocker.MagicMock()
    page_instance = DonationPageFactory(revenue_program=RevenueProgramFactory())
    mocker.patch("apps.pages.signals.google_cloud_pub_sub_is_configured", return_value=gcloud_configured)
    donation_page_page_published_handler(mocker.MagicMock(), instance=page_instance)
    if not gcloud_configured or not topic:
        assert publish_handler.return_value.publish.called is False
    else:
        expected_payload = {
            "page_id": page_instance.pk,
            "url": page_instance.page_url,
            "publication_date": str(page_instance.published_date),
            "revenue_program_id": page_instance.revenue_program.pk,
            "revenue_program_name": page_instance.revenue_program.name,
            "revenue_program_slug": page_instance.revenue_program.slug,
        }

        publish_handler.return_value.publish.assert_called_once_with(topic, Message(data=json.dumps(expected_payload)))
