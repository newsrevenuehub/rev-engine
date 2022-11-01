from unittest import TestCase
from unittest.mock import MagicMock, patch

import pytest as pytest

from apps.users.google_pub_sub import GoogleCloudPubSubPublisher, Message


class MessageTests(TestCase):
    def test_encodes_string_to_bytes(self):
        assert isinstance(Message("irrelevant").data, bytes)


class PublisherTests(TestCase):
    @pytest.mark.no_patch_google_cloud_pub_sub_publisher
    @patch("apps.users.google_pub_sub.pubsub_v1.PublisherClient", MagicMock())
    def test_publishes_to_google_cloud_pub_sub(self):
        topic = "topic"
        publisher = GoogleCloudPubSubPublisher()
        message = Message(data="some message")
        result = publisher.publish(topic, message)
        assert result
