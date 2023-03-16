import logging

from django.conf import settings

import requests
from celery import shared_task
from rest_framework import status

from apps.organizations.models import RevenueProgram


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


MAILCHIMP_EXCHANGE_OAUTH_CODE_FOR_ACCESS_TOKEN_URL = "https://login.mailchimp.com/oauth2/token"
BASE_URL = "http://127.0.0.1:8000"
MAILCHIMP_OAUTH_CALLBACK_URL = f"{BASE_URL}/mailchimp_callback"
MAILCHIMP_GET_SERVER_PREFIX_URL = "https://login.mailchimp.com/oauth2/metadata"


class MailchimpAuthflowRetryableError(Exception):
    """ """


class MailchimpAuthflowUnretryableError(Exception):
    """ """


def _get_and_set_mailchimp_access_token(revenue_program, oauth_code) -> RevenueProgram | None:
    """ """
    if missing := [x for x in ["MAILCHIMP_CLIENT_ID", "MAILCHIMP_CLIENT_SECRET"] if not getattr(settings, x, None)]:
        logger.warning(
            "`_get_and_set_mailchimp_access_token` called but app is missing required config vars: %s",
            ", ".join(missing),
        )
    response = requests.post(
        MAILCHIMP_EXCHANGE_OAUTH_CODE_FOR_ACCESS_TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "client_id": settings.MAILCHIMP_CLIENT_ID,
            "client_secret": settings.MAILCHIMP_CLIENT_SECRET,
            "redirect_uri": MAILCHIMP_OAUTH_CALLBACK_URL,
            "code": oauth_code,
        },
    )
    if not response.status_code == status.HTTP_200_OK:
        logger.warning(
            (
                "`_get_and_set_mailchimp_access_token` got an unexpected status code when trying to get an access token. "
                "The revenue program ID is %s, the oauth_code is %s, and the response status code is %s"
            ),
            revenue_program.id,
            oauth_code,
            response.status_code,
        )
        raise MailchimpAuthflowRetryableError(
            f"`_get_and_set_mailchimp_access_token` got an unexpected response status code of {response.status_code}"
        )
    if not (token := response.json().get("access_token", None)):
        logger.warning(
            (
                "`_get_and_set_mailchimp_access_token` got a response body missing an `access_token` parameter from Mailchimp when trying "
                "to get an access token for revenue program with ID %s"
            ),
            revenue_program.id,
        )
        raise MailchimpAuthflowUnretryableError(
            "`_get_and_set_mailchimp_access_token` got a response body missing a value for `access_token`"
        )
    revenue_program.mailchimp_access_token = token
    revenue_program.save(update_fields=["mailchimp_access_token"])
    logger.info(
        "`_get_and_set_mailchimp_access_token` successfully got an access token and saved it for revenue program with ID %s",
        revenue_program.id,
    )
    return revenue_program


def _get_and_set_mailchimp_server_prefix(revenue_program: RevenueProgram) -> None:
    """ """
    # confirm revenue_program has acccess_token
    if (token := revenue_program.mailchimp_access_token) is None:
        logger.warning(
            "`_get_and_set_mailchimp_server_prefix` called with a revenue program (ID %s) that has no value for mailchimp_access_token",
            revenue_program.id,
        )
        raise MailchimpAuthflowUnretryableError(
            "`_get_and_set_mailchimp_server_prefix` called with revenue program that has no mailchimp_access_token"
        )
    response = requests.get(MAILCHIMP_GET_SERVER_PREFIX_URL, headers={"Authorization": f"OAuth {token}"})
    if not response.status_code == status.HTTP_200_OK:
        raise MailchimpAuthflowRetryableError("")
    if not (prefix := response.json().get("dc", None)):
        logger.warning(
            (
                "`_get_and_set_mailchimp_server_prefix` got an unexpected status code when trying to retrieve the server prefix. "
                "The revenue program ID is %s and the response status code is %s"
            ),
            revenue_program.id,
            response.status_code,
        )
        raise MailchimpAuthflowRetryableError(
            f"`_get_and_set_mailchimp_server_prefix` got an unexpected response status code of {response.status_code}"
        )
    revenue_program.mailchimp_server_prefix = prefix
    revenue_program.save(update_fields=["mailchimp_server_prefix"])
    logger.info(
        "`_get_and_set_mailchimp_server_prefix` successfully retrieved the server prefix saved it for revenue program with ID %s",
        revenue_program.id,
    )


@shared_task(autoretry_for=(MailchimpAuthflowRetryableError,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def exchange_mailchimp_oauth_code_for_server_prefix_and_access_token(rp_id: int, oauth_code: str) -> None:
    revenue_program = RevenueProgram.objects.filter(pk=rp_id).first()
    if revenue_program is None:
        logger.warning("")
        return
    if revenue_program.mailchimp_access_token and revenue_program.mailchimp_server_prefix:
        logger.info("")
        return
    try:
        if not revenue_program.mailchimp_access_token:
            logger.info("")
            revenue_program = _get_and_set_mailchimp_access_token(revenue_program, oauth_code)
        if revenue_program.mailchimp_access_token and not revenue_program.mailchimp_server_prefix:
            logger.info("")
            _get_and_set_mailchimp_server_prefix(revenue_program)
    except MailchimpAuthflowUnretryableError:
        logger.exception(
            (
                "`exchange_mailchimp_oauth_code_for_server_prefix_and_access_token` encountered an unrecoverable error "
                "procesesing revenue program with ID %s using oauth-code %s"
            ),
            rp_id,
            oauth_code,
        )
        return
