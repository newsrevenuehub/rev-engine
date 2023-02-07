import json
import logging

from django.conf import settings
from django.db.models.signals import pre_save
from django.dispatch import receiver

from apps.common.utils import google_cloud_pub_sub_is_configured
from apps.google_cloud.pubsub import Message, Publisher
from apps.pages.models import DonationPage


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@receiver(pre_save, sender=DonationPage)
def donation_page_pre_save_handler(sender, instance, update_fields, **kwargs) -> None:
    """
    We only publish events for a page under the following conditions:
    1. page already existed in the database
    2. page has a published date
    3. google cloud pub sub is configured correctly
    4. there is an environment variable for PAGE_PUBLISHED_TOPIC
    """
    if all([instance.pk, instance.published_date, google_cloud_pub_sub_is_configured(), settings.PAGE_PUBLISHED_TOPIC]):
        existing_page = DonationPage.objects.get(pk=instance.pk)
        if not existing_page.published_date:
            logger.debug(
                "donation_page_pre_save_handler: Existing donation page published for the first time: %s", instance
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
