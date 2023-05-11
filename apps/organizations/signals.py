import logging

from django.conf import settings
from django.db.models.signals import post_delete
from django.dispatch import receiver

from apps.organizations.models import RevenueProgram


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@receiver(post_delete, sender=RevenueProgram)
def delete_rp_mailchimp_access_token_secret(sender, instance, *args, **kwargs) -> None:
    """When an RP is deleted, we delete the mailchimp_access_token_secret, if there is one"""
    logger.info("Deleting mailchimp_access_token_secret called on rp %s", instance.id)
    if instance.mailchimp_access_token:
        logger.info(
            "Deleting mailchimp_access_token_secret for rp %s",
            instance.id,
        )
        del instance.mailchimp_access_token
    else:
        logger.info("No mailchimp_access_token_secret to delete for rp %s", instance.id)
