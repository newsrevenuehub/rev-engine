import logging

from django.conf import settings
from django.db.models.signals import post_delete
from django.dispatch import receiver

from apps.google_cloud.secrets_manager import GoogleCloudSecretManagerException, delete_secret
from apps.organizations.models import RevenueProgram


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@receiver(post_delete, sender=RevenueProgram)
def delete_rp_mailchimp_access_token_secret(sender, instance, *args, **kwargs) -> None:
    """When an RP is deleted, we delete the mailchimp_access_token_secret, if there is one"""
    if instance.mailchimp_access_token:
        logger.info("Deleting mailchimp_access_token_secret for RevenueProgram %s", instance)
        try:
            delete_secret(
                project_id=settings.GOOGLE_CLOUD_PROJECT, secret_id=instance.mailchimp_access_token_secret_name
            )
        except GoogleCloudSecretManagerException:
            logger.exception(
                "Failed to delete mailchimp_access_token_secret for RevenueProgram with ID %s", instance.id
            )
            return
