from google.cloud.pubsub_v1 import futures

from apps.google_cloud.pubsub import Message, Publisher


def test_encodes_string_to_bytes():
    assert isinstance(Message("irrelevant").data, bytes)


def test_publishes_to_google_cloud_pub_sub(mocker, settings):
    publisher_client = mocker.Mock()
    settings.GOOGLE_CLOUD_PROJECT = "project"
    mocker.patch("google.cloud.pubsub_v1.PublisherClient", return_value=publisher_client)
    mocker.patch("google.oauth2.service_account.Credentials.from_service_account_info", return_value=None)
    topic = "topic"
    expected = "result"
    future = futures.Future()
    future.set_result(expected)
    full_topic_path = f"projects/{settings.GOOGLE_CLOUD_PROJECT}/topics/{topic}"
    publisher = Publisher()
    publisher.client = publisher_client
    publisher_client.topic_path.return_value = full_topic_path
    publisher_client.publish.return_value = future
    message = Message(data="some message")
    result = publisher.publish(topic, message)
    assert expected == result
    publisher_client.topic_path.assert_called_once_with(settings.GOOGLE_CLOUD_PROJECT, topic)
    publisher_client.publish.assert_called_once_with(full_topic_path, message.data)
