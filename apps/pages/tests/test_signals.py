import datetime
import json
from unittest.mock import MagicMock, patch

import pytest

from apps.google_cloud.pubsub import Message
from apps.organizations.tests.factories import RevenueProgramFactory
from apps.pages.signals import donation_page_pre_save
from apps.pages.tests.factories import DonationPageFactory


PAGE_TOPIC = "page-topic"


@pytest.mark.parametrize(
    "is_new_page, gcloud_configured, published_date, existing_published_date, topic",
    [
        (True, True, None, None, PAGE_TOPIC),
        (False, False, None, None, PAGE_TOPIC),
        (False, True, None, None, PAGE_TOPIC),
        (False, True, datetime.datetime.now(), None, None),
        (False, True, datetime.datetime.now(), datetime.datetime.now(), PAGE_TOPIC),
        (False, True, datetime.datetime.now(), None, PAGE_TOPIC),
    ],
)
@patch("apps.pages.signals.Publisher")
@pytest.mark.django_db
def test_page_pre_save_handler(
    publisher, is_new_page, gcloud_configured, published_date, existing_published_date, topic, monkeypatch
):
    monkeypatch.setattr("apps.pages.signals.settings.PAGE_PUBLISHED_TOPIC", topic)
    publisher_instance = MagicMock()
    publisher.get_instance.return_value = publisher_instance
    page_instance = DonationPageFactory(revenue_program=RevenueProgramFactory(), published_date=published_date)
    with patch("apps.pages.signals.google_cloud_pub_sub_is_configured") as gcloud_configured_util, patch(
        "apps.pages.signals.DonationPage.objects.get"
    ) as donation_objects_get:
        donation_objects_get.return_value = DonationPageFactory(published_date=existing_published_date)
        gcloud_configured_util.return_value = gcloud_configured
        donation_page_pre_save(MagicMock(), instance=page_instance, update_fields=None)
        if any([is_new_page, not gcloud_configured, not published_date, not topic]):
            assert not publisher_instance.publish.called
        elif existing_published_date:
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
