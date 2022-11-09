from unittest import TestCase
from unittest.mock import patch

from google.cloud.pubsub_v1 import futures

from apps.users.google_pub_sub import GoogleCloudPubSubPublisher, Message


class MessageTests(TestCase):
    def test_encodes_string_to_bytes(self):
        assert isinstance(Message("irrelevant").data, bytes)


class PublisherTests(TestCase):
    @patch("django.conf.settings.GOOGLE_CLOUD_PROJECT")
    @patch("apps.users.google_pub_sub.pubsub_v1.PublisherClient")
    def test_publishes_to_google_cloud_pub_sub(self, publisher_client, google_cloud_project):
        google_cloud_project.return_value = "project"
        topic = "topic"
        expected = "result"
        future = futures.Future()
        future.set_result(expected)
        full_topic_path = f"projects/{google_cloud_project}/topics/{topic}"
        publisher = GoogleCloudPubSubPublisher()
        publisher.client = publisher_client
        publisher_client.topic_path.return_value = full_topic_path
        publisher_client.publish.return_value = future
        message = Message(data="some message")
        result = publisher.publish(topic, message)
        assert expected == result
        publisher_client.topic_path.assert_called_with(google_cloud_project, topic)
        publisher_client.publish.assert_called_with(full_topic_path, message.data)
