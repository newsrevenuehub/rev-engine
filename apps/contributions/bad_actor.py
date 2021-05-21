import logging

from django.conf import settings

import requests


logger = logging.getLogger(__name__)


class BadActorAPIError(Exception):
    pass


def make_bad_actor_request(validated_data):
    if not settings.BAD_ACTOR_API_KEY or not settings.BAD_ACTOR_API_URL:
        logger.warning("BAD_ACTOR variable not set")
        raise BadActorAPIError("BAD_ACTOR variable not set, could not make request to BadActor API")

    headers = {
        "Authorization": f"Bearer {settings.BAD_ACTOR_API_KEY}",
    }
    response = requests.post(url=settings.BAD_ACTOR_API_URL, headers=headers, json=validated_data)
    if int(str(response.status_code)[:1]) != 2:
        logger.error("Received a BadActor API error")
        raise BadActorAPIError(response.json())
    return response
