import json
import logging

from django.conf import settings
from django.dispatch import Signal, receiver

from apps.common.utils import google_cloud_pub_sub_is_configured
from apps.google_cloud.pubsub import Message, Publisher


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


page_published = Signal(providing_args=["instance"])


@receiver(page_published)
def donation_page_page_published_handler(sender, instance, **kwargs) -> None:
    """Only publish events for a page under the following conditions.

    1. google cloud pub sub is configured correctly
    2. there is an environment variable for PAGE_PUBLISHED_TOPIC.
    """
    if google_cloud_pub_sub_is_configured() and settings.PAGE_PUBLISHED_TOPIC:
        logger.info(
            "donation_page_page_published_handler: Existing donation page published for the first time: %s", instance
        )
        message_data = {
            "page_id": instance.pk,
            "url": instance.page_url,
            "publication_date": str(instance.published_date),
            "revenue_program_id": instance.revenue_program.pk,
            "revenue_program_name": instance.revenue_program.name,
            "revenue_program_slug": instance.revenue_program.slug,
        }
        Publisher.get_instance().publish(settings.PAGE_PUBLISHED_TOPIC, Message(data=json.dumps(message_data)))
        return
    logger.warning(
        (
            "donation_page_page_published_handler: Unable to publish for page %s. google_cloud_pub_sub_is_configured: %s,"
            " settings.PAGE_PUBLISHED_TOPIC: %s"
        ),
        instance.id,
        google_cloud_pub_sub_is_configured(),
        settings.PAGE_PUBLISHED_TOPIC,
    )
