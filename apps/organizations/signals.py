import logging

from django.conf import settings
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

import reversion

from apps.organizations.models import CorePlan, Organization, RevenueProgram
from apps.organizations.tasks import setup_mailchimp_entities_for_rp_mailing_list
from apps.pages.models import DonationPage


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@receiver(post_save, sender=RevenueProgram)
def handle_rp_mailchimp_entity_setup(sender, instance: RevenueProgram, created: bool, **kwargs) -> None:
    logger.debug("handle_mailchimp_entity_setup called on rp %s", instance.id)
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
def handle_delete_rp_mailchimp_access_token_secret(sender, instance, *args, **kwargs) -> None:
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


def get_page_to_be_set_as_default(rp) -> DonationPage:
    # Default donation page corresponds to the org’s only donation page that exists at the time of upgrade,
    # if only one exists. If two pages exist, default donation page should correspond to the only page
    # published at the time of upgrade. If two pages exist but neither is published, default donation page should
    # correspond to the first page created for that Org/RP.
    if (count := rp.donationpage_set.count()) == 0:
        return None
    elif count == 1:
        return rp.donationpage_set.first()
    # Is it okay to only look at > 1
    elif count > 1:
        return (
            rp.donationpage_set.filter(is_published=True).order_by("created").first()
            if rp.donationpage_set.filter(is_published=True).exists()
            else rp.donationpage_set.order_by("created").first()
        )


@receiver(post_save, sender=Organization)
def handle_set_default_donation_page(sender, instance: Organization, created: bool, **kwargs) -> None:
    """

    Note that this gets called whether first time or nth time an org is saved and its plan is core
    but no default donation page
    """
    logger.debug("handle_set_default_donation_page called on org %s", instance.id)
    if instance.plan != CorePlan:
        logger.debug("Org %s is not on CorePlan, skipping", instance.id)
        return
    if not (rp := instance.revenueprogram_set.first()):
        logger.warning("No RP found for organization %s", instance.id)
        return
    if rp.default_donation_page:
        logger.debug("RP %s already has a default donation page %s", rp.id, rp.default_donation_page.id)
        return
    if page := get_page_to_be_set_as_default(rp):
        logger.info("Setting default_donation_page for RP %s to page %s", rp.id, page.id)
        rp.default_donation_page = page
        with reversion.create_revision():
            rp.save(update_fields={"default_donation_page", "modified"})
            reversion.set_comment("handle_set_default_donation_page set default_donation_page")
    else:
        logger.warning("No donation pages found for RP %s, can't set default donation page", rp.id)
