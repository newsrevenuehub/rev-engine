import logging
from json.decoder import JSONDecodeError

from django.conf import settings

import requests
from pydantic import BaseModel, ValidationError


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class BadActorScore(BaseModel):
    """Represents nested items of the Bad Actor API response."""

    judgment: int
    label: str
    value: str


class BadActorOverallScore(BaseModel):
    """Represents the top-level structure of the Bad Actor API response."""

    overall_judgment: int
    items: list[BadActorScore]


class BadActorAPIError(Exception):
    pass


def get_bad_actor_score(validated_data) -> BadActorOverallScore:
    """Make a request to the bad actor API and return score data.

    Note that this function tries hard to return the response.json() as a dict or else raise a BadActorAPIError.

    param validated_data: json posted to bad actor api.
    return: BadActorOverallScore derived from API response's JSON
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
    try:
        response = requests.post(
            url=settings.BAD_ACTOR_API_URL,
            headers=headers,
            json=validated_data,
            timeout=settings.REQUESTS_TIMEOUT_DEFAULT,
        )
    except Exception as exc:
        logger.exception("BadActor API request failed communicating with API")
        raise BadActorAPIError("BadActor API request failed") from exc
    try:
        json_response = response.json()
    except JSONDecodeError as exc:
        logger.exception("BadActor API request failed with malformed JSON")
        raise BadActorAPIError("BadActor API request failed with malformed JSON") from exc
    try:
        return BadActorOverallScore(**json_response)
    except ValidationError as exc:
        logger.exception("BadActor API request failed with invalid JSON")
        raise BadActorAPIError("BadActor API request failed with invalid JSON") from exc
