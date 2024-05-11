import logging
from typing import Literal

from django.conf import settings

import requests
from rest_framework import status


logger = logging.getLogger(f"{settings.DEFAULT_LOGGER}.{__name__}")


API_VERSION = "2022-11-01"
BASE_URL = f"https://api.hookdeck.com/{API_VERSION}"
CONNECTIONS_URL = f"{BASE_URL}/connections"
DESTINATIONS_URL = f"{BASE_URL}/destinations"
SOURCES_URL = f"{BASE_URL}/sources"


class HookDeckIntegrationError(Exception): ...


HEADERS = {"Authorization": f"Bearer {settings.HOOKDECK_API_KEY}"}

# TODO: [DEV-4205] Configure Hookdeck retry for failed webhooks to be within Stripe signature verification tolerance.
#  https://hookdeck.com/docs/configure-connection-rules


def upsert(entity_type: Literal["connection", "destination"], data: dict, auto_unarchive: bool = True) -> dict:
    """Upsert given entity type to Hookdeck.

    When True, the `auto_unarchive` param will cause a found-but-previously-archived entity in
    to be unarchived and have its state set to state in `data`. This is helpful for our primary use
    case for Hookdeck: review apps. In that context, we should expect to sometimes need to restore a previous
    entity named after a ticket/review app.
    """
    logger.info("Upserting %s with data %s and auto_unarchive %s", entity_type, data, auto_unarchive)
    response = requests.put(
        {"connection": CONNECTIONS_URL, "destination": DESTINATIONS_URL}[entity_type],
        data=data,
        headers=HEADERS,
        timeout=31,
    )
    if response.status_code != status.HTTP_200_OK:
        logger.error("Unexpected response from Hookdeck API: %s", response.content)
        raise HookDeckIntegrationError("Something went wrong. It's been logged.")
    if (resp_data := response.json()).get("archived_at", None) is not None and auto_unarchive:
        logger.info("Unarchiving Hookdeck %s with id %s", entity_type, resp_data["id"])
        data = unarchive(entity_type, resp_data["id"])
    else:
        data = response.json()
    return data


def upsert_destination(name: str, url: str, auto_unarchive: bool = True) -> dict | None:
    """Upsert a destination to Hookdeck.

    A *destination* is a named URL to which Hookdeck should forward on received webhooks.

    This will return None if required parameters are missing.

    When True, the `auto_unarchive` param will cause a found-but-previously-archived entity in
    to be unarchived and have its state set to state in `data`. This is helpful for our primary use
    case for Hookdeck: review apps. In that context, we should expect to sometimes need to restore a previous
    entity named after a ticket/review app.
    """
    logger.info("Upserting a destination with name %s url %s and auto_unarchive %s", name, url, auto_unarchive)
    missing = set()
    if not name:
        missing.add("name")
    if not url:
        missing.add("url")
    if missing:
        logger.warning("Missing required params: %s. Will not upsert this destination", missing)
        return None
    return upsert(
        "destination",
        {
            "name": name,
            "url": url,
        },
    )


def upsert_connection(name: str, source_id: str, destination_id: str, auto_unarchive: bool = True) -> dict | None:
    """Upsert a connection to Hookdeck.

    A *connection* maps a Hookdeck source to a Hookdeck destination. A given source can be configured
    to have many destinations via a connection.

    This will return None if required parameters are missing.

    When True, the `auto_unarchive` param will cause a found-but-previously-archived entity in
    to be unarchived and have its state set to state in `data`. This is helpful for our primary use
    case for Hookdeck: review apps. In that context, we should expect to sometimes need to restore a previous
    entity named after a ticket/review app.
    """
    logger.info(
        "Upserting connection with name %s, source id %s, and destination id %s", name, source_id, destination_id
    )
    missing = set()
    if not name:
        missing.add("name")
    if not source_id:
        missing.add("source_id")
    if not destination_id:
        missing.add("destination_id")
    if missing:
        logger.warning("Missing required params: %s. Will not upsert this connection", missing)
        return None
    return upsert(
        "connection",
        {"name": name, "source_id": source_id, "destination_id": destination_id},
    )


def retrieve(entity_type: Literal["connection", "destination", "source"], id_: str) -> dict:
    """Retrieve an entity from Hookdeck."""
    response = requests.get(
        f"""{
            {"connection": CONNECTIONS_URL, "destination": DESTINATIONS_URL, "source": SOURCES_URL
            }[entity_type]
        }/{id_}""",
        headers=HEADERS,
        timeout=31,
    )
    if response.status_code != status.HTTP_200_OK:
        logger.error("Unexpected response from Hookdeck API")
        raise HookDeckIntegrationError("Something went wrong retrieving destination. It's been logged.")
    return response.json()


def search(entity_type: Literal["connection", "destination", "source"], params: dict) -> dict:
    """Search for Hookdeck entities matching search criteria in `params`."""
    response = requests.get(
        {"connection": CONNECTIONS_URL, "destination": DESTINATIONS_URL, "source": SOURCES_URL}[entity_type],
        headers={
            "Authorization": f"Bearer {settings.HOOKDECK_API_KEY}",
        },
        params=dict(params),
        timeout=31,
    )
    if response.status_code != status.HTTP_200_OK:
        logger.error(
            "Unexpected response from Hookdeck API retrieving %s: status %s", entity_type, response.status_code
        )
        raise HookDeckIntegrationError(f"Something went wrong retrieving {entity_type}. It's been logged.")
    return response.json()


def search_connections(
    id_: str | None = None,
    name: str | None = None,
    full_name: str | None = None,
    source_id: str | None = None,
    destination_id: str | None = None,
    archived: bool = True,
) -> dict:
    """Search Hookdeck connections.

    Can search by name, full name, source id, destination id, and archived status.
    """
    params = {
        k: v
        for (k, v) in {
            "id": id_,
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
    id_: str | None = None, name: str | None = None, archived: bool = True, url: str | None = None
) -> dict:
    """Search Hookdeck destinations.

    Can search by name, archived status, and url.
    """
    params = {k: v for (k, v) in {"id": id_, "name": name, "url": url, "archived": archived}.items() if k is not None}
    return search("destination", params)


def search_sources(
    id_: str | None = None,
    name: str | None = None,
    archived: bool = True,
) -> dict:
    """Search Hookdeck destinations.

    Can search by name, archived status, and url.
    """
    params = {k: v for (k, v) in {"id": id_, "name": name, "archived": archived}.items() if k is not None}
    return search("source", params)


def archive(entity_type: Literal["connection", "destination", "source"], id_: str) -> dict:
    """Archive a Hookdeck entity.

    Archiving an entity causes that entities send/receipt behavior to cease. An archived resource can be
    unarchived to turn that behavior back on. Archiving is not the same as deleting.
    """
    logger.info("Archiving %s with id %s", entity_type, id_)
    response = requests.put(
        f"""{
            {'connection': CONNECTIONS_URL, 'destination': DESTINATIONS_URL}[entity_type]
        }/{id_}/archive""",
        headers=HEADERS,
        timeout=31,
    )
    if response.status_code != status.HTTP_200_OK:
        logger.error("Unexpected response from Hookdeck API archiving %s with id %s", entity_type, id_)
        raise HookDeckIntegrationError(f"Something went wrong archiving {entity_type} with id {id_}. It's been logged.")
    return response.json()


def unarchive(entity_type: Literal["connection", "destination", "source"], id_: str) -> dict:
    """Unarchive a Hookdeck entity.

    Uncarhiving an entity resumes its send/receipt behavior if the entity was previously in an "arhived" state.
    """
    response = requests.put(
        f"""{
            {'connection': CONNECTIONS_URL, 'destination': DESTINATIONS_URL}[entity_type]
        }/{id_}/unarchive""",
        headers=HEADERS,
        timeout=31,
    )
    if response.status_code != status.HTTP_200_OK:
        logger.error("Unexpected response from Hookdeck API archiving %s with id %s", entity_type, id_)
        raise HookDeckIntegrationError(f"Something went wrong archiving {entity_type} with id {id_}. It's been logged.")
    return response.json()


def bootstrap_endpoint(name: str, url: str, source_id: str) -> None:
    logger.info("Upserting a destination with name %s and url %s", name, url)
    dest = upsert_destination(name=name, url=url)
    logger.info(
        "Upserting connection with name %s and destination with id %s",
        name,
        (dest_id := dest["id"]),
    )
    upsert_connection(name, source_id, dest_id)


def bootstrap(name: str, webhooks_url_contributions: str, webhooks_url_upgrades: str) -> dict:
    """Bootstrap an app deployment's Stripe/Hookdeck integration.

    This function assumes that a Stripe webhook source already exists in the Hookdeck instance.

    Two destinations and two connections will be created, one for each of the two Stripe webhook sources.

    The first Stripe webhook source is for webhooks related to contributions.

    The second source is for webhooks related to self-upgrades.
    """
    bootstrap_endpoint(
        f"{name}-stripe-contributions",
        webhooks_url_contributions,
        settings.HOOKDECK_STRIPE_WEBHOOK_SOURCE_CONTRIBUTIONS,
    )
    bootstrap_endpoint(
        f"{name}-stripe-upgrades", webhooks_url_upgrades, settings.HOOKDECK_STRIPE_WEBHOOK_SOURCE_UPGRADES
    )


def tear_down(
    ticket_prefix: str,
) -> None:
    """Tear down an app deployment's Stripe/Hookdeck integration.

    This function assumes that certain conventions are being followed around branch naming and how that
    relates to ticket prefixes (see implementation above in `bootstrap`), etc (specifically that connection
    and destination names are both set to the ticket ID along with suffixes for `-stripe-contributions` and `-stripe-upgrades`).
    It searches by ticket prefix for destinations and connections in Hookdeck and archives all found entities.
    """
    logger.info("Tearing down Hookdeck integration for ticket with prefix %s", ticket_prefix)
    conn_names = [f"{ticket_prefix}-stripe-contributions", f"{ticket_prefix}-stripe-upgrades"]
    conns = []
    dests = []
    for x in conn_names:
        logger.info("Finding connections and destinations for %s", x)
        found_conns = search_connections(name=x)["models"]
        if not found_conns:
            logger.info("No connections found for name %s", x)
        conns.extend(found_conns)
        found_dests = search_destinations(name=x)["models"]
        if not found_dests:
            logger.info("No destinations found for name %s", x)
        dests.extend(found_dests)
    logger.info("Found %s connections and %s destinations", len(conns), len(dests))
    for x in conns:
        archive("connection", x["id"])
    for x in dests:
        archive("destination", x["id"])
