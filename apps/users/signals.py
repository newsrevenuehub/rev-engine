import logging

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.google_pub_sub.publisher import GoogleCloudPubSubPublisher, Message
from apps.users.models import User
from revengine.settings.base import GOOGLE_CLOUD_NEW_USER_NOTIFICATION_TOPIC


google_cloud_pub_sub_publisher = GoogleCloudPubSubPublisher()

logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@receiver(post_save, sender=User)
def process_user_post_save(signal, instance, created, **kwargs):
    user_email: str = instance.email
    logger.info("post_save signal received for user with email %s; created: %s", user_email, created)
    if created and not user_email.endswith("@fundjournalism.org"):
        logger.info("post_save signal for new user %s; will dispatch to google cloud", user_email)
        google_cloud_pub_sub_publisher.publish(GOOGLE_CLOUD_NEW_USER_NOTIFICATION_TOPIC, Message(data=user_email))
