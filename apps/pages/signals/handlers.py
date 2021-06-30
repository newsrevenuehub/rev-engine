from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.emails.models import PageEmailTemplate


@receiver(post_save, sender="pages.DonationPage")
def my_handler(sender, **kwargs):  # pragma: no cover
    instance = kwargs.get("instance")
    defaults = PageEmailTemplate.defaults.all()

    if kwargs.get("created"):
        for email_template in defaults:
            instance.email_templates.add(email_template)
    else:
        if templates := defaults.difference(instance.email_templates.all()):
            for email_template in templates:
                instance.email_templates.add(email_template)
