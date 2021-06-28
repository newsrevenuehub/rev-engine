import logging

from django.conf import settings

import requests

from apps.contributions.serializers import AbstractPaymentSerializer


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
    json_data["amount"] = AbstractPaymentSerializer.convert_cents_to_amount(json_data["amount"])
    response = requests.post(url=settings.BAD_ACTOR_API_URL, headers=headers, json=json_data)
    if int(str(response.status_code)[:1]) != 2:
        logger.warning(f"Received a BadActor API error: {response.json()}")
        raise BadActorAPIError(response.json())
    return response
