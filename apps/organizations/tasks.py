import logging

from django.conf import settings

from celery import shared_task


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@shared_task
def exchange_mailchimp_oauth_token_for_server_prefix_and_access_token(rp_id, oauth_token):
    pass
