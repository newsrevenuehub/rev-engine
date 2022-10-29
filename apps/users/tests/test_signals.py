from unittest import TestCase
from unittest.mock import MagicMock, patch

from apps.google_pub_sub.publisher import Message
from apps.users.models import User
from apps.users.signals import process_user_post_save
from revengine.settings.base import GOOGLE_CLOUD_NEW_USER_NOTIFICATION_TOPIC


class TestUserSignals(TestCase):
    @patch("apps.google_pub_sub.publisher.GoogleCloudPubSubPublisher.publish")
    def test_post_save_will_not_publish_for_existing_record(self, google_cloud_publish):
        process_user_post_save(MagicMock(), User(email="test@example.com"), created=False)
        assert not google_cloud_publish.called

    @patch("apps.google_pub_sub.publisher.GoogleCloudPubSubPublisher.publish")
    def test_post_save_does_not_publish_hub_employees(self, google_cloud_publish):
        process_user_post_save(MagicMock(), User(email="test@fundjournalism.org"), created=True)
        assert not google_cloud_publish.called

    @patch("apps.google_pub_sub.publisher.GoogleCloudPubSubPublisher.publish")
    def test_post_save_publishes_external_users(self, google_cloud_publish):
        process_user_post_save(MagicMock(), User(email="test@gmail.com"), created=True)
        google_cloud_publish.assert_called_with(
            GOOGLE_CLOUD_NEW_USER_NOTIFICATION_TOPIC, Message(data="test@gmail.com")
        )
