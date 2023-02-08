import json
import logging

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.common.utils import google_cloud_pub_sub_is_configured
from apps.google_cloud.pubsub import Message, Publisher
from apps.pages.models import DonationPage


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


def _is_newly_published(update_fields, instance):
    if "published_date" in update_fields:
        breakpoint()


@receiver(post_save, sender=DonationPage)
def donation_page_post_save_handler(
    sender, instance: DonationPage, created: bool, raw, using, update_fields, **kwargs
) -> None:
    """
    We only publish events for a page under the following conditions:
    1. page already existed in the database
    2. page has a published date
    3. google cloud pub sub is configured correctly
    4. there is an environment variable for PAGE_PUBLISHED_TOPIC
    """
    logger.debug(
        (
            "`donation_page_post_save_handler` called with page with ID %s `created` as %s, `update_fields` "
            "as %s, GC pubsub configured as %s , topic as %s"
        ),
        instance.id,
        created,
        ", ".join(update_fields or []),
        google_cloud_pub_sub_is_configured(),
        settings.PAGE_PUBLISHED_TOPIC,
    )
    breakpoint()
    if all(
        [
            google_cloud_pub_sub_is_configured(),
            settings.PAGE_PUBLISHED_TOPIC,
            any([created and instance.published_date, not created and _is_newly_published(update_fields, instance)]),
        ]
    ):
        logger.debug(
            "`donation_page_post_save_handler` publishing topic %s for page with ID %s",
            settings.PAGE_PUBLISHED_TOPIC,
            instance.id,
        )
        Publisher.get_instance().publish(
            settings.PAGE_PUBLISHED_TOPIC,
            Message(
                data=json.dumps(
                    {
                        "page_id": instance.pk,
                        "url": instance.page_url,
                        "publication_date": str(instance.published_date),
                        "revenue_program_id": instance.revenue_program.pk,
                        "revenue_program_name": instance.revenue_program.name,
                        "revenue_program_slug": instance.revenue_program.slug,
                    }
                )
            ),
        )
