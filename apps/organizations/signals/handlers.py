from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="organizations.RevenueProgram")
def handle_revenue_program_post_save(sender, **kwargs):
    revenue_program = kwargs.get("instance")
    created = kwargs.get("created")
    if created:
        revenue_program.payment_provider.stripe_create_apple_pay_domain()
