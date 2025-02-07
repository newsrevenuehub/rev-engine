import logging

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.contributions.models import Payment


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@receiver(post_save, sender=Payment)
def handle_payment_post_save(sender, instance: Payment, created: bool, **kwargs) -> None:
    logger.debug("handle_payment_post_save called on payment %s", instance.id)
    instance.publish_payment_created() if created else instance.publish_payment_updated()
