import asyncio
from unittest import TestCase
from unittest.mock import patch

import pytest as pytest

from apps.google_pub_sub.publisher import GoogleCloudPubSubPublisher, Message
from revengine.settings.base import GOOGLE_CLOUD_PROJECT


class MessageTests(TestCase):
    def test_encodes_string_to_bytes(self):
        assert isinstance(Message("irrelevant").data, bytes)


class PublisherTests(TestCase):
    @pytest.mark.no_patch_google_cloud_pub_sub_publisher
    @patch("apps.google_pub_sub.publisher.pubsub_v1.PublisherClient.publish")
    def test_publishes_to_google_cloud_pub_sub(self, publisher_client_publish):
        future = asyncio.Future()
        future.set_result("message published")
        publisher_client_publish.return_value = future
        publisher = GoogleCloudPubSubPublisher()
        topic = "topic"
        message = Message(data="some message")
        publisher.publish(topic, message)
        publisher_client_publish.assert_called_with(f"projects/{GOOGLE_CLOUD_PROJECT}/topics/{topic}", message.data)
