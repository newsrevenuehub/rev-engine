import logging
from dataclasses import dataclass

from google.cloud import pubsub_v1

from revengine.settings.base import GOOGLE_CLOUD_PROJECT


logger = logging.getLogger(__name__)


@dataclass
class Message:
    data: bytes

    def __init__(self, data=""):
        self.data = data.encode("utf-8")


class GoogleCloudPubSubPublisher:
    def __init__(self):
        self.client = pubsub_v1.PublisherClient()
        self.project_id = GOOGLE_CLOUD_PROJECT

    def publish(self, topic, message: Message):
        logger.info("Received data to publish %s", message)
        topic_path = self.client.topic_path(self.project_id, topic)
        future = self.client.publish(topic_path, message.data)
        result = future.result()
        logger.info("Published data result with id %s to %s", result, topic)
        return result
