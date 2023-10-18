import logging
from dataclasses import dataclass

from django.conf import settings

from google.cloud import pubsub_v1
from google.oauth2 import service_account


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@dataclass
class Message:
    data: bytes

    def __init__(self, data=""):
        self.data = data.encode("utf-8")


class Publisher:
    __instance = None

    def __init__(self):
        self.client = pubsub_v1.PublisherClient(
            credentials=service_account.Credentials.from_service_account_info(settings.GS_SERVICE_ACCOUNT)
        )
        self.project_id = settings.GOOGLE_CLOUD_PROJECT

    def publish(self, topic, message: Message):
        logger.info("Received data to publish %s", message)
        topic_path = self.client.topic_path(self.project_id, topic)
        result = self.client.publish(topic_path, message.data).result(timeout=3)
        logger.info("Published data result with id %s to %s", result, topic)
        return result

    @classmethod
    def get_instance(cls):
        """Returns an instance of Publisher;
        Singleton pattern was chosen here since it is not necessary to instantiate/authenticate multiple times with
        GoogleCloud, and it will only do it the first time the application requires it. Additionally, memory is saved by
        sharing the same instance across RevEngine"""
        if not cls.__instance:
            cls.__instance = Publisher()
        return cls.__instance
