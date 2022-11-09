import logging
from dataclasses import dataclass

from django.conf import settings

from google.cloud import pubsub_v1


logger = logging.getLogger(__name__)


@dataclass
class Message:
    data: bytes

    def __init__(self, data=""):
        self.data = data.encode("utf-8")


class GoogleCloudPubSubPublisher:

    __instance = None

    def __init__(self):
        self.client = pubsub_v1.PublisherClient()
        self.project_id = settings.GOOGLE_CLOUD_PROJECT

    def publish(self, topic, message: Message):
        logger.info("Received data to publish %s", message)
        topic_path = self.client.topic_path(self.project_id, topic)
        future = self.client.publish(topic_path, message.data)
        result = future.result(timeout=3)
        logger.info("Published data result with id %s to %s", result, topic)
        return result

    @classmethod
    def get_instance(cls):
        if not cls.__instance:
            cls.__instance = GoogleCloudPubSubPublisher()
        return cls.__instance
