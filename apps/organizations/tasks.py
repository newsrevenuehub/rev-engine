import logging

from django.conf import settings

import requests
import reversion
from celery import shared_task
from rest_framework import status

from apps.organizations.models import RevenueProgram


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


MAILCHIMP_EXCHANGE_OAUTH_CODE_FOR_ACCESS_TOKEN_URL = "https://login.mailchimp.com/oauth2/token"
MAILCHIMP_OAUTH_CALLBACK_URL = f"{settings.SITE_URL}/mailchimp/oauth_success/"
MAILCHIMP_GET_SERVER_PREFIX_URL = "https://login.mailchimp.com/oauth2/metadata"


class MailchimpAuthflowRetryableError(Exception):
    """ """


class MailchimpAuthflowUnretryableError(Exception):
    """"""


def exchange_mc_oauth_code_for_mc_access_token(oauth_code: str) -> str:
    if missing := [x for x in ["MAILCHIMP_CLIENT_ID", "MAILCHIMP_CLIENT_SECRET"] if not getattr(settings, x, None)]:
        logger.error(
            "`exchange_mc_oauth_code_for_mc_access_token` called but app is missing required config vars: %s",
            ", ".join(missing),
        )
        raise MailchimpAuthflowUnretryableError(
            "exchange_mc_oauth_code_for_mc_access_token | required configuration is missing"
        )

    request_data = {
        "grant_type": "authorization_code",
        "client_id": settings.MAILCHIMP_CLIENT_ID,
        "client_secret": settings.MAILCHIMP_CLIENT_SECRET,
        "redirect_uri": MAILCHIMP_OAUTH_CALLBACK_URL,
        "code": oauth_code,
    }

    logger.info(
        "exchange_mc_oauth_code_for_mc_access_token making a request to Mailchimp with the following data: %s",
        request_data | {"code": "REDACTED"},
    )
    response = requests.post(MAILCHIMP_EXCHANGE_OAUTH_CODE_FOR_ACCESS_TOKEN_URL, data=request_data)

    if not response.status_code == status.HTTP_200_OK:
        logger.error(
            (
                "`exchange_mc_oauth_code_for_mc_access_token` got an unexpected status code when trying to get an access token. "
                "The response status code is %s, and the response contained: %s"
            ),
            response.status_code,
            getattr(response, "json", lambda: {})() or {},
        )
        raise MailchimpAuthflowRetryableError(
            f"`exchange_mc_oauth_code_for_mc_access_token` got an unexpected response status code of {response.status_code}"
        )
    if not (token := response.json().get("access_token", None)):
        logger.error(
            "`exchange_mc_oauth_code_for_mc_access_token` got a response body missing an `access_token` parameter from Mailchimp"
        )
        raise MailchimpAuthflowUnretryableError(
            "`exchange_mc_oauth_code_for_mc_access_token` got a response body missing a value for `access_token`"
        )
    return token


def get_mailchimp_server_prefix(access_token: str) -> str:
    """
    NB: Don't log or expose access token in any error messages.
    """
    logger.info("get_mailchimp_server_prefix called with access_token was called")
    response = requests.get(MAILCHIMP_GET_SERVER_PREFIX_URL, headers={"Authorization": f"OAuth {access_token}"})
    if not response.status_code == status.HTTP_200_OK:
        logger.error("get_mailchimp_server_prefix called but got a non-200 status code: %s", response.status_code)
        raise MailchimpAuthflowRetryableError(
            f"Non-200 status code when trying to get server prefix: {response.status_code}"
        )
    prefix = response.json().get("dc", None)
    if not prefix:
        logger.error(
            "`get_mailchimp_server_prefix` got a response body missing a `dc` parameter from Mailchimp when trying to get a server prefix"
        )
        raise MailchimpAuthflowUnretryableError(
            f"`get_mailchimp_server_prefix` got an unexpected response status code of {response.status_code}"
        )
    logger.info("get_mailchimp_server_prefix called retrieved a server prefix of %s", prefix)
    return prefix


@shared_task(autoretry_for=(MailchimpAuthflowRetryableError,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def exchange_mailchimp_oauth_code_for_server_prefix_and_access_token(rp_id: int, oauth_code: str) -> None:
    """ """
    logger.info("exchange_mailchimp_oauth_code_for_server_prefix_and_access_token called with rp_id %s", rp_id)
    revenue_program = RevenueProgram.objects.filter(pk=rp_id).first()
    update_data = {}
    if revenue_program is None:
        logger.error(
            "exchange_mailchimp_oauth_code_for_server_prefix_and_access_token cannot find revenue program with ID %s",
            rp_id,
        )
        return
    if revenue_program.mailchimp_access_token and revenue_program.mailchimp_server_prefix:
        logger.info(
            "exchange_mailchimp_oauth_code_for_server_prefix_and_access_token called but retrieved RP already MC values set"
        )
        return
    try:
        if not revenue_program.mailchimp_access_token:
            logger.info(
                "exchange_mailchimp_oauth_code_for_server_prefix_and_access_token is attempting to exchange an oauth code for an access token for RP with ID %s",
                rp_id,
            )
            update_data["mailchimp_access_token"] = exchange_mc_oauth_code_for_mc_access_token(oauth_code)
        access_token = update_data.get("mailchimp_access_token", revenue_program.mailchimp_access_token)
        if access_token and not revenue_program.mailchimp_server_prefix:
            logger.info(
                "exchange_mailchimp_oauth_code_for_server_prefix_and_access_token is attempting to retrieve the MC server prefix for RP with ID %s",
                rp_id,
            )
            update_data["mailchimp_server_prefix"] = get_mailchimp_server_prefix(access_token)
    except MailchimpAuthflowUnretryableError:
        logger.exception(
            (
                "`exchange_mailchimp_oauth_code_for_server_prefix_and_access_token` encountered an unrecoverable error "
                "procesesing revenue program with ID %s"
            ),
            rp_id,
        )
        return
    finally:
        if update_data:
            for k, v in update_data.items():
                setattr(revenue_program, k, v)
            with reversion.create_revision():
                logger.info(
                    "exchange_mailchimp_oauth_code_for_server_prefix_and_access_token updating RP with ID %s", rp_id
                )
                revenue_program.save(update_fields=set(update_data.keys()).union({"modified"}))
                reversion.set_comment("exchange_mailchimp_oauth_code_for_server_prefix_and_access_token")
