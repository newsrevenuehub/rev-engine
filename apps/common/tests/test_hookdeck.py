import json
from unittest.mock import Mock

from django.conf import settings
from django.utils import timezone

import pytest
import responses
from rest_framework import status

from apps.common.hookdeck import (
    CONNECTIONS_URL,
    DESTINATIONS_URL,
    HookDeckIntegrationError,
    archive,
    bootstrap,
    retrieve,
    search_connections,
    search_destinations,
    tear_down,
    unarchive,
    upsert,
    upsert_connection,
    upsert_destination,
)


@responses.activate
@pytest.mark.parametrize(
    "entity_type,data,response_fixture",
    (
        (
            "connection",
            {"name": "my-connection", "source_id": "<source-id>", "destination_id": "<destination-id>"},
            "apps/common/tests/fixtures/hookdeck-upsert-connection-success.json",
        ),
        (
            "destination",
            {"name": "my-destination", "url": "https://www.somewhere.com"},
            "apps/common/tests/fixtures/hookdeck-upsert-destination-success.json",
        ),
    ),
)
def test_upsert_happy_path(entity_type, data, response_fixture):
    with open(response_fixture) as fl:
        fixture = json.load(fl)
    responses.add(
        responses.PUT,
        CONNECTIONS_URL if entity_type == "connection" else DESTINATIONS_URL,
        json=fixture,
        status=status.HTTP_200_OK,
    )
    result = upsert(entity_type, data)
    assert result == fixture


def test_upsert_bad_entity():
    entity_type = "unexpected"
    with pytest.raises(KeyError):
        upsert(entity_type, {})  # type: ignore


@pytest.fixture
def now():
    return timezone.now()


@responses.activate
@pytest.mark.parametrize(
    "entity_type,is_archived,auto_unarchive",
    (
        ("connection", False, False),
        ("connection", False, True),
        ("connection", True, False),
        ("connection", True, True),
        ("destination", False, False),
        ("destination", False, True),
        ("destination", True, False),
        ("destination", True, True),
    ),
)
def test_upsert_auto_unarchive(entity_type, is_archived, auto_unarchive, now):
    if entity_type == "connection":
        upsert_fixture_path = (
            "apps/common/tests/fixtures/hookdeck-upsert-connection-when-archived.json"
            if is_archived
            else "apps/common/tests/fixtures/hookdeck-upsert-connection-success.json"
        )
    else:
        upsert_fixture_path = (
            "apps/common/tests/fixtures/hookdeck-upsert-destination-when-archived.json"
            if is_archived
            else "apps/common/tests/fixtures/hookdeck-upsert-destination-success.json"
        )
    with open(upsert_fixture_path) as fl:
        upsert_fixture = json.load(fl)
        unarchive_response_fixture = upsert_fixture | {"archived_at": None}

    responses.add(
        responses.PUT,
        CONNECTIONS_URL if entity_type == "connection" else DESTINATIONS_URL,
        json=upsert_fixture,
        status=status.HTTP_200_OK,
    )
    responses.add(
        responses.PUT,
        f"{CONNECTIONS_URL if entity_type == 'connection' else DESTINATIONS_URL}/{upsert_fixture['id']}/unarchive",
        json=unarchive_response_fixture,
        status=status.HTTP_200_OK,
    )
    result = upsert(entity_type, {}, auto_unarchive=auto_unarchive)
    if auto_unarchive:
        assert result["archived_at"] is None
    else:
        assert result["archived_at"] == upsert_fixture["archived_at"]


@pytest.mark.parametrize("entity_type", ("connection", "destination"))
def test_upsert_when_hookdeck_not_200(entity_type):
    responses.add(
        responses.PUT,
        CONNECTIONS_URL if entity_type == "connection" else DESTINATIONS_URL,
        json={},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
    with pytest.raises(HookDeckIntegrationError):
        upsert(entity_type, {})


def test_upsert_destination(monkeypatch):
    kwargs = {"name": "my-destination", "url": "https://foo.bar"}
    mock = Mock()
    monkeypatch.setattr("apps.common.hookdeck.upsert", mock)
    upsert_destination(**kwargs)
    mock.assert_called_once_with("destination", kwargs)


def test_upsert_connection(monkeypatch):
    kwargs = {"name": "my-connection", "source_id": "<some-source-id>", "destination_id": "<some-destination-id>"}
    mock = Mock()
    monkeypatch.setattr("apps.common.hookdeck.upsert", mock)
    upsert_connection(**kwargs)
    mock.assert_called_once_with("connection", kwargs)


@responses.activate
@pytest.mark.parametrize(
    "entity_type,fixture_path",
    (
        ("connection", "apps/common/tests/fixtures/hookdeck-retrieve-connection.json"),
        ("destination", "apps/common/tests/fixtures/hookdeck-retrieve-destination.json"),
    ),
)
def test_retrieve_happy_path(entity_type, fixture_path):
    with open(fixture_path) as fl:
        fixture = json.load(fl)
    responses.add(
        responses.GET,
        f"{CONNECTIONS_URL if entity_type == 'connection' else DESTINATIONS_URL}/{fixture['id']}",
        json=fixture,
        status=status.HTTP_200_OK,
    )
    assert retrieve(entity_type, fixture["id"]) == fixture


@responses.activate
@pytest.mark.parametrize("entity_type", ("connection", "destination"))
def test_retrieve_when_hookdeck_not_200(entity_type):
    id = "<my-id>"
    responses.add(
        responses.GET,
        f"{CONNECTIONS_URL if entity_type == 'connection' else DESTINATIONS_URL}/{id}",
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
    with pytest.raises(HookDeckIntegrationError):
        retrieve(entity_type, id)


@responses.activate
@pytest.mark.parametrize("has_results", (True, False))
def test_search_connections(has_results):
    params = {
        "id": "<some-id>",
        "name": "my-connection",
        "full_name": "my-source-name-my-connection-name",
        "source_id": "<some-source-id>",
        "destination_id": "<some-destination-id>",
    }
    fixture_path = (
        "apps/common/tests/fixtures/hookdeck-search-connections.json"
        if has_results
        else "apps/common/tests/fixtures/hookdeck-search-no-results.json"
    )
    with open(fixture_path) as fl:
        fixture = json.load(fl)

    responses.add(responses.GET, f"{CONNECTIONS_URL}", json=fixture)
    result = search_connections(**params)
    assert set(result.keys()).issuperset({"pagination", "count", "models"})
    assert set(result["pagination"].keys()) == {"order_by", "dir", "limit"}


@responses.activate
def test_search_connections_when_hookdeck_non_200():
    responses.add(responses.GET, f"{CONNECTIONS_URL}", status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    with pytest.raises(HookDeckIntegrationError):
        assert search_connections(name="something")


@responses.activate
@pytest.mark.parametrize("has_results", (True, False))
def test_search_destinations(has_results):
    params = {
        "id": "<some-id>",
        "name": "my-destination",
        "url": "https://www.somewhere.com",
    }
    fixture_path = (
        "apps/common/tests/fixtures/hookdeck-search-destinations.json"
        if has_results
        else "apps/common/tests/fixtures/hookdeck-search-no-results.json"
    )
    with open(fixture_path) as fl:
        fixture = json.load(fl)

    responses.add(responses.GET, f"{DESTINATIONS_URL}", json=fixture)
    result = search_destinations(**params)
    assert set(result.keys()).issuperset({"pagination", "count", "models"})
    assert set(result["pagination"].keys()) == {"order_by", "dir", "limit"}


@responses.activate
def test_search_destinations_when_hookdeck_non_200():
    responses.add(responses.GET, f"{DESTINATIONS_URL}", status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    with pytest.raises(HookDeckIntegrationError):
        assert search_destinations(name="something")


@responses.activate
@pytest.mark.parametrize("entity_type", ("connection", "destination"))
def test_archive(entity_type):
    fixture_path = f"apps/common/tests/fixtures/hookdeck-archive-{entity_type}.json"
    with open(fixture_path) as fl:
        fixture = json.load(fl)
    responses.add(
        responses.PUT,
        f"{CONNECTIONS_URL if entity_type == 'connection' else DESTINATIONS_URL}/{fixture['id']}/archive",
        json=fixture,
        status=status.HTTP_200_OK,
    )
    assert archive(entity_type, fixture["id"]) == fixture


@responses.activate
@pytest.mark.parametrize("entity_type", ("connection", "destination"))
def test_archive_when_hookdeck_non_200(entity_type):
    id = "my-id"
    responses.add(
        responses.PUT,
        f"{CONNECTIONS_URL if entity_type == 'connection' else DESTINATIONS_URL}/{id}/archive",
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
    with pytest.raises(HookDeckIntegrationError):
        assert archive(entity_type, id)


@responses.activate
@pytest.mark.parametrize("entity_type", ("connection", "destination"))
def test_unarchive(entity_type):
    fixture_path = f"apps/common/tests/fixtures/hookdeck-unarchive-{entity_type}.json"
    with open(fixture_path) as fl:
        fixture = json.load(fl)
    responses.add(
        responses.PUT,
        f"{CONNECTIONS_URL if entity_type == 'connection' else DESTINATIONS_URL}/{fixture['id']}/unarchive",
        json=fixture,
        status=status.HTTP_200_OK,
    )
    assert unarchive(entity_type, fixture["id"]) == fixture


@responses.activate
@pytest.mark.parametrize("entity_type", ("connection", "destination"))
def test_unarchive_when_hookdeck_non_200(entity_type):
    id = "my-id"
    responses.add(
        responses.PUT,
        f"{CONNECTIONS_URL if entity_type == 'connection' else DESTINATIONS_URL}/{id}/unarchive",
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
    with pytest.raises(HookDeckIntegrationError):
        assert unarchive(entity_type, id)


def test_bootstrap(monkeypatch):
    destination_id = "dest-id"
    mock_upsert_destination = Mock(return_value={"id": destination_id})
    mock_upsert_connection = Mock()
    name = "name"
    destination_url = "https://www.somewhere.com"
    monkeypatch.setattr("apps.common.hookdeck.upsert_destination", mock_upsert_destination)
    monkeypatch.setattr("apps.common.hookdeck.upsert_connection", mock_upsert_connection)
    bootstrap(name, destination_url)
    mock_upsert_destination.assert_called_once_with(name=name, url=destination_url)
    mock_upsert_connection.assert_called_once_with(name, settings.HOOKDECK_STRIPE_WEBHOOK_SOURCE, destination_id)


def test_teardown(monkeypatch):
    mock_search_destinations = Mock(
        return_value={"models": [{"id": "some-id-1", "name": "something"}, {"id": "some-id-2", "name": "something"}]}
    )
    mock_search_connections = Mock(
        return_value={
            "models": [
                {"id": "some-id-3", "name": "something"},
            ]
        }
    )
    mock_archive = Mock()
    monkeypatch.setattr("apps.common.hookdeck.search_destinations", mock_search_destinations)
    monkeypatch.setattr("apps.common.hookdeck.search_connections", mock_search_connections)
    monkeypatch.setattr("apps.common.hookdeck.archive", mock_archive)
    ticket_name = "my-unique-ticket-name"
    tear_down(ticket_name)
    mock_search_destinations.assert_called_once_with(name=ticket_name)
    mock_search_connections.assert_called_once_with(name=ticket_name)
    assert mock_archive.call_count == len(mock_search_destinations.return_value["models"]) + len(
        mock_search_connections.return_value["models"]
    )
