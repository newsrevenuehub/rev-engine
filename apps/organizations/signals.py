import logging

from django.conf import settings
from django.db.models.signals import post_delete
from django.dispatch import receiver

from apps.common.google_cloud_secrets import GoogleCloudSecretManagerException, delete_secret
from apps.organizations.models import RevenueProgram


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@receiver(post_delete, sender=RevenueProgram)
def delete_rp_mailchimp_access_token_secret(sender, instance) -> None:
    """"""
    if instance.mailchimp_access_token_secret:
        logger.info("Deleting mailchimp_access_token_secret for RevenueProgram %s", instance)
        try:
            delete_secret(instance.mailchimp_access_token_secret)
        except GoogleCloudSecretManagerException:
            logger.exception(
                "Failed to delete mailchimp_access_token_secret for RevenueProgram with ID %s", instance.id
            )
            return
