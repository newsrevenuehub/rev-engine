import logging
from typing import Literal, Optional

from django.conf import settings

import requests
from rest_framework import status


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


API_VERSION = "2022-11-01"
BASE_URL = f"https://api.hookdeck.com/{API_VERSION}"
CONNECTIONS_URL = f"{BASE_URL}/connections"
DESTINATIONS_URL = f"{BASE_URL}/destinations"
SOURCES_URL = f"{BASE_URL}/sources"


class HookDeckIntegrationError(Exception):
    """"""


HEADERS = {"Authorization": f"Bearer {settings.HOOKDECK_API_KEY}"}


def upsert(entity_type: Literal["connection", "destination"], data: dict, auto_unarchive: bool = True) -> dict:
    """Upsert given entity type to Hookdeck"""
    response = requests.put(
        {"connection": CONNECTIONS_URL, "destination": DESTINATIONS_URL}[entity_type],
        data=data,
        headers=HEADERS,
    )
    if response.status_code != status.HTTP_200_OK:
        logger.exception("Something unexpected happened: %s", response.content)
        raise HookDeckIntegrationError("Something went wrong. It's been logged.")
    if (resp_data := response.json())["archived_at"] is not None and auto_unarchive:
        logger.info("Unarchiving Hookdeck %s with id %s", entity_type, resp_data["id"])
        data = unarchive(entity_type, resp_data["id"])
    else:
        data = response.json()
    return data


def upsert_destination(name: str, url: str, auto_unarchive: bool = True) -> dict:
    """Upsert a destination to Hookdeck.

    A *destination* is a named URL to which Hookdeck should forward on received webhooks.
    """
    return upsert(
        "destination",
        {
            "name": name,
            "url": url,
        },
    )


def upsert_connection(name: str, source_id: str, destination_id: str, auto_unarchive: bool = True) -> dict:
    """Upsert a connection to Hookdeck.

    A *connection* maps a Hookdeck source to a Hookdeck destination. A given source can be configured
    to have many destinations via a connection.
    """

    return upsert(
        "connection",
        {"name": name, "source_id": source_id, "destination_id": destination_id},
    )


def retrieve(entity_type: Literal["connection", "destination", "source"], id: str) -> dict:
    """Retrieve an entity from Hookdeck"""
    try:
        response = requests.get(
            f"""{
                {"connection": CONNECTIONS_URL, "destination": DESTINATIONS_URL, "source": SOURCES_URL
                }[entity_type]
            }/{id}""",
            headers=HEADERS,
        )
        if response.status_code != status.HTTP_200_OK:
            raise
        return response.json()
    except:  # noqa: E722
        logger.exception("Something unexpected happened")
        raise HookDeckIntegrationError("Something went wrong retrieving destination. It's been logged.")


def search(entity_type: Literal["connection", "destination", "source"], params) -> dict:
    """Search for Hookdeck entities matching search criteria in `params`"""
    response = requests.get(
        {"connection": CONNECTIONS_URL, "destination": DESTINATIONS_URL, "source": SOURCES_URL}[entity_type],
        headers={
            "Authorization": f"Bearer {settings.HOOKDECK_API_KEY}",
        },
        params=dict(params),
    )
    if response.status_code != status.HTTP_200_OK:
        logger.exception("Something unexpected happened retrieving %s", entity_type)
        raise HookDeckIntegrationError(f"Something went wrong retrieving {entity_type}. It's been logged.")
    else:
        return response.json()


def search_connections(
    id: Optional[str] = None,
    name: Optional[str] = None,
    full_name: Optional[str] = None,
    source_id: Optional[str] = None,
    destination_id: Optional[str] = None,
    archived: bool = True,
) -> dict:
    """Search Hookdeck connections.

    Can search by name, full name, source id, destination id, and archived status.
    """
    params = {
        k: v
        for (k, v) in {
            "id": id,
            "name": name,
            "full_name": full_name,
            "source_id": source_id,
            "destination_id": destination_id,
            "archived": archived,
        }.items()
        if k is not None
    }
    return search("connection", params)


def search_destinations(
    id: Optional[str] = None, name: Optional[str] = None, archived: bool = True, url: Optional[str] = None
) -> dict:
    """Search Hookdeck destinations.

    Can search by name, archived status, and url.
    """
    params = {k: v for (k, v) in {"id": id, "name": name, "url": url, "archived": archived}.items() if k is not None}
    return search("destination", params)


def search_sources(
    id: Optional[str] = None,
    name: Optional[str] = None,
    archived: bool = True,
) -> dict:
    """Search Hookdeck destinations.

    Can search by name, archived status, and url.
    """
    params = {k: v for (k, v) in {"id": id, "name": name, "archived": archived}.items() if k is not None}
    return search("source", params)


def archive(entity_type: Literal["connection", "destination", "source"], id: str) -> dict:
    """Archive a Hookdeck entity.

    Archiving an entity causes that entities send/receipt behavior to cease. An archived resource can be
    unarchived to turn that behavior back on. Archiving is not the same as deleting.
    """
    response = requests.put(
        f"""{
            {'connection': CONNECTIONS_URL, 'destination': DESTINATIONS_URL}[entity_type]
        }/{id}/archive""",
        headers=HEADERS,
    )
    if response.status_code != status.HTTP_200_OK:
        logger.exception("Something unexpected happened archiving %s with id %s", entity_type, id)
        raise HookDeckIntegrationError(f"Something went wrong archiving {entity_type} with id {id}. It's been logged.")
    else:
        return response.json()


def unarchive(entity_type: Literal["connection", "destination", "source"], id: str) -> dict:
    """Unarchive a Hookdeck entity.

    Uncarhiving an entity resumes its send/receipt behavior if the entity was previously in an "arhived" state.
    """
    response = requests.put(
        f"""{
            {'connection': CONNECTIONS_URL, 'destination': DESTINATIONS_URL}[entity_type]
        }/{id}/unarchive""",
        headers=HEADERS,
    )
    if response.status_code != status.HTTP_200_OK:
        logger.exception("Something unexpected happened archiving %s with id %s", entity_type, id)
        raise HookDeckIntegrationError(f"Something went wrong archiving {entity_type} with id {id}. It's been logged.")
    else:
        return response.json()


def bootstrap(name: str, destination_url: str) -> dict:
    """Used to bootstrap an app deployment's Stripe/Hookdeck integration


    This function assumes that a Stripe webhook source already exists in the Hookdeck instance. It upserts
    a new destination (which is the webhook receipt endpoint in the deployed app) to Hookdeck, then creates a connection
    between that destination and the Hookdeck Stripe webhook source.
    """
    logger.info("Upserting a destination with name %s and url %s", name, destination_url)
    destination = upsert_destination(name=name, url=destination_url)
    logger.info("Upserting connection with name %s", name)
    upsert_connection(name, settings.HOOKDECK_STRIPE_WEBHOOK_SOURCE, destination["id"])


def tear_down(
    ticket_prefix: str,
) -> dict:
    """Used to tear down an app deployment's Stripe/Hookdeck integration


    This function assumes that certain conventions are being followed around branch naming and how that
    relates to ticket prefixes (see implementation above in `bootstrap`), etc (specifically that connection and destination names are both set to the ticket ID).
    It searches by ticket prefix for destinations and connections in Hookdeck and archives all found entities.
    """
    conns = search_connections(name=ticket_prefix)["models"]
    if not conns:
        logger.info("No connections found for ticket with prefix %s", ticket_prefix)
    else:
        for x in conns:
            logger.info("Archiving connection #%s, %s", x["id"], x["name"])
            archive("connection", x["id"])
    dests = search_destinations(name=ticket_prefix)["models"]
    if not dests:
        logger.info("No destinations found for ticket with prefix %s found", ticket_prefix)
    else:
        for x in dests:
            logger.info("Archiving destination #%s, %s", x["id"], x["name"])
            archive("destination", x["id"])
