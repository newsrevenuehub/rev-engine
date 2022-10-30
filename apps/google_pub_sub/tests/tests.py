import asyncio
from unittest import TestCase
from unittest.mock import MagicMock, patch

import pytest as pytest

from apps.google_pub_sub.publisher import GoogleCloudPubSubPublisher, Message
from revengine.settings.base import GOOGLE_CLOUD_PROJECT


class MessageTests(TestCase):
    def test_encodes_string_to_bytes(self):
        assert isinstance(Message("irrelevant").data, bytes)


class PublisherTests(TestCase):
    @pytest.mark.no_patch_google_cloud_pub_sub_publisher
    @patch("apps.google_pub_sub.publisher.pubsub_v1.PublisherClient", MagicMock())
    def test_publishes_to_google_cloud_pub_sub(self):
        topic = "topic"
        expected = "result"
        future = asyncio.Future()
        future.set_result(expected)
        full_topic_path = f"projects/{GOOGLE_CLOUD_PROJECT}/topics/{topic}"
        publisher = GoogleCloudPubSubPublisher()
        publisher.client.topic_path.return_value = full_topic_path
        publisher.client.publish.return_value = future
        message = Message(data="some message")
        result = publisher.publish(topic, message)
        assert expected == result
        publisher.client.topic_path.assert_called_with(GOOGLE_CLOUD_PROJECT, topic)
        publisher.client.publish.assert_called_with(full_topic_path, message.data)
