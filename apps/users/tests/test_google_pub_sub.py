from unittest.mock import MagicMock

from google.cloud.pubsub_v1 import futures

from apps.users.google_pub_sub import GoogleCloudPubSubPublisher, Message


def test_encodes_string_to_bytes():
    assert isinstance(Message("irrelevant").data, bytes)


def test_publishes_to_google_cloud_pub_sub(monkeypatch):
    google_cloud_project = "project"
    publisher_client = MagicMock()
    monkeypatch.setattr("django.conf.settings.GOOGLE_CLOUD_PROJECT", google_cloud_project)
    monkeypatch.setattr("apps.users.google_pub_sub.pubsub_v1.PublisherClient", publisher_client)
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
    publisher_client.topic_path.called_with(google_cloud_project, topic)
    publisher_client.publish.called_with(full_topic_path, message.data)
