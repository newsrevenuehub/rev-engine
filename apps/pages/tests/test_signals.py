import datetime
from unittest.mock import MagicMock

import pytest
import pytest_cases


PAGE_TOPIC = "page-topic"


@pytest.fixture
def now():
    return datetime.datetime.now()


@pytest.fixture
def before(now):
    return now - datetime.timedelta(days=7)


@pytest.fixture
def page_update_published_data(now):
    return {"published_date": now}


# class _MockPublisher:

#     def __init__(self, publish_spy):
#         pass

#     def publish(self, topic, message):
#         pass


# Publisher.get_instance().publish(settings.PAGE_PUBLISHED_TOPIC, Message(data=json.dumps(message_data)))


@pytest_cases.parametrize(
    "page,update_data,gcloud_configured,topic,expect_publish",
    [
        (pytest_cases.fixture_ref("live_donation_page"), {"name": "foo"}, True, PAGE_TOPIC, False),
        (
            pytest_cases.fixture_ref("live_donation_page"),
            pytest_cases.fixture_ref("page_update_published_data"),
            True,
            PAGE_TOPIC,
            False,
        ),
        (pytest_cases.fixture_ref("unpublished_donation_page"), {"name": "foo"}, True, PAGE_TOPIC, False),
        (
            pytest_cases.fixture_ref("unpublished_donation_page"),
            pytest_cases.fixture_ref("page_update_published_data"),
            True,
            PAGE_TOPIC,
            True,
        ),
    ],
)
# @patch("apps.pages.signals.Publisher")
@pytest.mark.django_db
def test_page_post_save_handler_handler(page, update_data, gcloud_configured, topic, expect_publish, monkeypatch):
    monkeypatch.setattr("apps.pages.signals.settings.PAGE_PUBLISHED_TOPIC", topic)
    monkeypatch.setattr("apps.pages.signals.google_cloud_pub_sub_is_configured", lambda: gcloud_configured)
    # monkeypatch.setattr("apps.pages.signals.Publisher.get_instance", lambda: MagicMock().publish)
    # spy
    for k, v in update_data.items():
        setattr(page, k, v)
    page._foo = "bar"
    page.save(update_fields=["name", "published_date"])
    breakpoint()
    # assert Publisher.get_instance().publish(settings.PAGE_PUBLISHED_TOPIC, Message(data=json.dumps(message_data)))

    # else:
    #     expected_payload = {
    #         "page_id": page_instance.pk,
    #         "url": page_instance.page_url,
    #         "publication_date": str(page_instance.published_date),
    #         "revenue_program_id": page_instance.revenue_program.pk,
    #         "revenue_program_name": page_instance.revenue_program.name,
    #         "revenue_program_slug": page_instance.revenue_program.slug,
    #     }
    #     publisher_instance.publish.assert_called_with(topic, Message(data=json.dumps(expected_payload)))
