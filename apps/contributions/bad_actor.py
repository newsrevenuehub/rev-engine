import logging
from json.decoder import JSONDecodeError

from django.conf import settings

import requests


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class BadActorAPIError(Exception):
    pass


def make_bad_actor_request(validated_data):
    """Bad Actor API result.

    param validated_data: json posted to bad actor api.
    return: response.json() API response json
    raises: BadActorAPIError
    """
    if not settings.BAD_ACTOR_API_KEY or not settings.BAD_ACTOR_API_URL:
        bits = []
        if not settings.BAD_ACTOR_API_KEY:
            bits.append("BAD_ACTOR_API_KEY not set")
        if not settings.BAD_ACTOR_API_URL:
            bits.append("BAD_ACTOR_API_URL not set")
        bits.append("could not make request to BadActor API")
        logger.error(", ".join(bits))
        raise BadActorAPIError(", ".join(bits))

    headers = {
        "Authorization": f"Bearer {settings.BAD_ACTOR_API_KEY}",
    }
    json_data = validated_data.copy()
    response = requests.post(url=settings.BAD_ACTOR_API_URL, headers=headers, json=json_data, timeout=31)
    if int(str(response.status_code)[:1]) != 2:  # eh? if not response.ok #  Includes 3xx
        try:
            logger.warning("Received a BadActor API error: %s", response.json())
            raise BadActorAPIError(response.json())
        except JSONDecodeError as exc:
            logger.warning("Received a BadActor API error with malformed JSON")
            raise BadActorAPIError("Received a BadActor API error with malformed JSON") from exc
    return response
