import logging
from functools import partial

from django.conf import settings
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

import reversion

from apps.common.models import SocialMeta
from apps.organizations.models import CorePlan, Organization, RevenueProgram
from apps.organizations.tasks import setup_mailchimp_entities_for_rp_mailing_list
from apps.pages.models import DonationPage


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@receiver(post_save, sender=RevenueProgram)
def handle_rp_activecampaign_setup(sender, instance: RevenueProgram, created: bool, **kwargs) -> None:
    logger.debug("handle_rp_activecampaign_setup called on rp %s", instance.id)

    # - We have been created:
    #   - And we have enough for the integration to be active
    # - Or we have been updated:
    #   - And either property has changed
    #   - And we have enough for the integration to be active

    update_fields = kwargs.get("update_fields") or {}
    if any(
        [
            all([created, instance.activecampaign_integration_connected]),
            all(
                [
                    not created,
                    any(x in update_fields for x in ("activecampaign_access_token", "activecampaign_server_url")),
                    instance.activecampaign_integration_connected,
                ]
            ),
        ]
    ):
        logger.info("Publishing ActiveCampaign configuration complete message for RP %s", instance.id)
        instance.publish_revenue_program_activecampaign_configuration_complete()
    else:
        logger.debug("Not publishing ActiveCampaign configuration complete message for RP %s", instance.id)


@receiver(post_save, sender=RevenueProgram)
def handle_rp_mailchimp_entity_setup(sender, instance: RevenueProgram, created: bool, **kwargs) -> None:
    logger.debug("handle_mailchimp_entity_setup called on rp %s", instance.id)
    if any(
        [
            # if it's an update and mailchimp_list_id is being set
            all(
                [
                    not created,
                    (update_fields := kwargs.get("update_fields") or {}),
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
        transaction.on_commit(partial(setup_mailchimp_entities_for_rp_mailing_list.delay, rp_id=instance.id))
    else:
        logger.debug(
            "Not enqueuing task to setup mailchimp entities for revenue program mailing list for RP %s", instance.id
        )


@receiver(post_save, sender=RevenueProgram)
def create_default_social_meta(sender, instance: RevenueProgram, created: bool, **kwargs) -> None:
    """Create default social meta for RP."""
    logger.debug("called on rp %s", instance.id)
    if not created:
        logger.debug("Not creating default social meta for RP %s because it is not new", instance.id)
        return
    if hasattr(instance, "socialmeta"):
        logger.debug("Not creating default social meta for RP %s because it already exists", instance.id)
        return

    logger.info("Creating default social meta for RP %s", instance.id)
    # TODO @BW: Wrap this side effect in transaction.on_commit
    # DEV-5817
    social = SocialMeta.objects.create(revenue_program=instance)
    logger.info('Social Meta with id "%s" created for RP id "%s"', social.id, instance.id)


@receiver(post_delete, sender=RevenueProgram)
def handle_delete_rp_mailchimp_access_token_secret(sender, instance, *args, **kwargs) -> None:
    """When an RP is deleted, we delete the mailchimp_access_token_secret, if there is one."""
    logger.debug("hand handle_delete_rp_mailchimp_access_token_secret on rp %s", instance.id)
    if instance.mailchimp_access_token:
        logger.info(
            "Deleting mailchimp_access_token_secret for rp %s",
            instance.id,
        )
        # TODO @BW: Wrap this side effect in transaction.on_commit
        # DEV-5817
        del instance.mailchimp_access_token
    else:
        logger.debug("No mailchimp_access_token_secret to delete for rp %s", instance.id)


def get_page_to_be_set_as_default(rp) -> DonationPage:
    """Return the page to be set as default donation page for an RP."""
    logger.debug("get_page_to_be_set_as_default called on rp %s", rp.id)
    match count := rp.donationpage_set.count():
        case 0:
            return None
        case 1:
            return rp.donationpage_set.first()
        case _ if count > 1:
            query = rp.donationpage_set.order_by("created")
            return query.filter(published_date__isnull=False).first() or query.first()


@receiver(post_save, sender=Organization)
def handle_set_default_donation_page_on_select_core_plan(
    sender, instance: Organization, created: bool, **kwargs
) -> None:
    """Under certain conditions, set the default_donation_page of an RP of the sending org.

    Under the following conditions the default donation page will be set when saving an org:

    - The org is on the CorePlan
    - The org is either being created with CorePlan.name as value for plan_name or is being updated
    with `plan_name` as an update field and CorePlan.name as the new value
    - The org has at least one RP
    - The org's RP does not have a default_donation_page set
    - The org's RP has at least one donation page

    Preference is given for:

    - first RP in terms of `created` value if there are more than 1 encountered
    - First published page (by creation date) if there are multiple pages

    """
    logger.debug("handle_set_default_donation_page_on_select_core_plan called on org %s", instance.id)
    if instance.plan != CorePlan:
        logger.debug("Org %s is not on CorePlan, skipping", instance.id)
        return
    # TODO @BW: Wrap some of this routine in transaction.on_commit
    # DEV-5817
    if not (rp := instance.revenueprogram_set.first()):
        logger.debug("No RP found for organization %s, skipping", instance.id)
        return

    if rp.default_donation_page:
        logger.debug("RP %s already has a default donation page %s", rp.id, rp.default_donation_page.id)
        return

    is_update_to_core_plan = all(
        [
            not created,
            "plan_name" in (kwargs.get("update_fields") or {}),
            instance.plan_name == CorePlan.name,
        ]
    )
    is_create_with_core_plan = all([created, instance.plan_name == CorePlan.name])
    if not any([is_update_to_core_plan, is_create_with_core_plan]):
        logger.debug(
            "Skipping for org %s because is_update_to_core_plan is %s and is_create_with_core_plan is %s",
            instance.id,
            is_update_to_core_plan,
            is_create_with_core_plan,
        )
        return
    if page := get_page_to_be_set_as_default(rp):
        logger.info("Setting default_donation_page for RP %s to page %s", rp.id, page.id)
        rp.default_donation_page = page
        with reversion.create_revision():
            rp.save(update_fields={"default_donation_page", "modified"})
            reversion.set_comment("handle_set_default_donation_page_on_select_core_plan set default_donation_page")
    else:
        logger.warning("No donation pages found for RP %s, can't set default donation page", rp.id)
