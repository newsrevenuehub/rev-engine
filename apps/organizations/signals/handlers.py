from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="organizations.RevenueProgram")
def my_handler(sender, **kwargs):
    revenue_program = kwargs.get("instance")
    created = kwargs.get("created")
    if created:
        revenue_program.stripe_create_apple_pay_domain()
