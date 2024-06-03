import logging

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.common.utils import google_cloud_pub_sub_is_configured
from apps.google_cloud.pubsub import Message, Publisher
from apps.users.models import User


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@receiver(post_save, sender=User)
def user_post_save_handler(sender, instance, created, **kwargs) -> None:
    """We publish a message whenever user is added for the first time."""
    if not created:
        logger.debug("user_post_save_handler: Existing user modified, will not send to Google Cloud")
        return
    if not google_cloud_pub_sub_is_configured() or not settings.NEW_USER_TOPIC:
        logger.warning(
            "user_post_save_handler: Unable to proceed with publishing message, please verify GoogleCloudPubSub configuration"
        )
        return
    logger.info("user_post_save_handler: Will publish email to Google Cloud PubSub for user: %s", instance.email)
    Publisher.get_instance().publish(settings.NEW_USER_TOPIC, Message(data=instance.email))
