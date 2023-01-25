from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.pages.models import DonationPage


@receiver(post_save, Model=get_user_model())
def user_post_save_handler(sender, **kwargs):
    pass


@receiver(post_save, Model=DonationPage)
def page_post_save_handler(sender, **kwargs):
    pass


# def __page_is_publishable(self) -> bool:
#     previous_record = None
#     if self.pk:
#         previous_record = DonationPage.objects.get(pk=self.pk)
#     return self.published_date or previous_record and previous_record.published_date
