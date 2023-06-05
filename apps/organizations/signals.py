import logging

from django.conf import settings
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.organizations.models import RevenueProgram
from apps.organizations.tasks import setup_mailchimp_entities_for_rp_mailing_list


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@receiver(post_save, sender=RevenueProgram)
def revenue_program_post_save(sender, instance, created, **kwargs) -> None:
    """Decide whether or not to trigger the creation of RP-related Mailchimp entities based on the state of the RP."""
    if any(
        [
            # if it's an update and mailchimp_list_id is being set
            all(
                [
                    not created,
                    (update_fields := kwargs.get("update_fields", None) or {}),
                    "mailchimp_list_id" in update_fields,
                    instance.mailchimp_list_id,
                ]
            ),
            # if it's new and mailchimp_list_id is set
            all([created, instance.mailchimp_list_id]),
        ]
    ):
        logger.info(
            "Enqueuing task to setup mailchimp entities for revenue program mailing list for RP %s", instance.id
        )
        setup_mailchimp_entities_for_rp_mailing_list.delay(instance.id)
    else:
        logger.info(
            "Not enqueuing task to setup mailchimp entities for revenue program mailing list for RP %s", instance.id
        )


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
