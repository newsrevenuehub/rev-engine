import logging
from json.decoder import JSONDecodeError

from django.conf import settings

import requests


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class BadActorAPIError(Exception):
    pass


def make_bad_actor_request(validated_data):
    if not settings.BAD_ACTOR_API_KEY or not settings.BAD_ACTOR_API_URL:
        logger.warning("BAD_ACTOR variable not set")
        raise BadActorAPIError("BAD_ACTOR variable not set, could not make request to BadActor API")

    headers = {
        "Authorization": f"Bearer {settings.BAD_ACTOR_API_KEY}",
    }
    json_data = validated_data.copy()
    response = requests.post(url=settings.BAD_ACTOR_API_URL, headers=headers, json=json_data)
    if int(str(response.status_code)[:1]) != 2:
        try:
            logger.warning("Received a BadActor API error: %s", response.json())
            raise BadActorAPIError(response.json())
        except JSONDecodeError:
            logger.warning("Received a BadActor API error with malformed JSON")
            raise BadActorAPIError("Received a BadActor API error with malformed JSON")

    return response
