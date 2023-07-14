import json
from unittest.mock import Mock

from django.urls import reverse
from django.utils import timezone

import pytest
import pytest_cases
import responses
from rest_framework import status

from apps.common.hookdeck import (
    CONNECTIONS_URL,
    DESTINATIONS_URL,
    SOURCES_URL,
    HookDeckIntegrationError,
    archive,
    bootstrap,
    logger,
    retrieve,
    search_connections,
    search_destinations,
    search_sources,
    tear_down,
    unarchive,
    upsert,
    upsert_connection,
    upsert_destination,
)


@pytest.fixture
def upsert_connection_response():
    with open("apps/common/tests/fixtures/hookdeck-upsert-connection-success.json") as fl:
        return json.load(fl)


@pytest.fixture
def upsert_archived_connection_response():
    with open("apps/common/tests/fixtures/hookdeck-upsert-connection-when-archived.json") as fl:
        return json.load(fl)


@pytest.fixture
def upsert_destination_response():
    with open("apps/common/tests/fixtures/hookdeck-upsert-destination-success.json") as fl:
        return json.load(fl)


@pytest.fixture
def upsert_archived_destination_response():
    with open("apps/common/tests/fixtures/hookdeck-upsert-destination-when-archived.json") as fl:
        return json.load(fl)


@pytest.fixture
def retrieve_connection_response():
    with open("apps/common/tests/fixtures/hookdeck-retrieve-connection.json") as fl:
        return json.load(fl)


@pytest.fixture
def retrieve_destination_response():
    with open("apps/common/tests/fixtures/hookdeck-retrieve-destination.json") as fl:
        return json.load(fl)


@pytest.fixture
def retrieve_source_response():
    with open("apps/common/tests/fixtures/hookdeck-retrieve-source.json") as fl:
        return json.load(fl)


@pytest.fixture
def search_connections_response():
    with open("apps/common/tests/fixtures/hookdeck-search-connections.json") as fl:
        return json.load(fl)


@pytest.fixture
def search_destinations_response():
    with open("apps/common/tests/fixtures/hookdeck-search-destinations.json") as fl:
        return json.load(fl)


@pytest.fixture
def search_sources_response():
    with open("apps/common/tests/fixtures/hookdeck-search-sources.json") as fl:
        return json.load(fl)


@pytest.fixture
def search_no_results_response():
    with open("apps/common/tests/fixtures/hookdeck-search-no-results.json") as fl:
        return json.load(fl)


@pytest.fixture
def archive_connection_response():
    with open("apps/common/tests/fixtures/hookdeck-archive-connection.json") as fl:
        return json.load(fl)


@pytest.fixture
def archive_destination_response():
    with open("apps/common/tests/fixtures/hookdeck-archive-destination.json") as fl:
        return json.load(fl)


@pytest.fixture
def unarchive_destination_response():
    with open("apps/common/tests/fixtures/hookdeck-unarchive-destination.json") as fl:
        return json.load(fl)


@pytest.fixture
def unarchive_connection_response():
    with open("apps/common/tests/fixtures/hookdeck-unarchive-connection.json") as fl:
        return json.load(fl)


@responses.activate
@pytest_cases.parametrize(
    "entity_type,data,response_data",
    (
        (
            "connection",
            {"name": "my-connection", "source_id": "<source-id>", "destination_id": "<destination-id>"},
            pytest_cases.fixture_ref("upsert_connection_response"),
        ),
        (
            "destination",
            {"name": "my-destination", "url": "https://www.somewhere.com"},
            pytest_cases.fixture_ref("upsert_destination_response"),
        ),
    ),
)
def test_upsert_happy_path(entity_type, data, response_data):
    responses.add(
        responses.PUT,
        CONNECTIONS_URL if entity_type == "connection" else DESTINATIONS_URL,
        json=response_data,
        status=status.HTTP_200_OK,
    )
    result = upsert(entity_type, data)
    assert result == response_data


def test_upsert_bad_entity():
    entity_type = "unexpected"
    with pytest.raises(KeyError):
        upsert(entity_type, {})  # type: ignore


@pytest.fixture
def now():
    return timezone.now()


@responses.activate
@pytest_cases.parametrize(
    "entity_type,response_data,resource_url,auto_unarchive",
    (
        ("connection", pytest_cases.fixture_ref("upsert_connection_response"), CONNECTIONS_URL, False),
        ("connection", pytest_cases.fixture_ref("upsert_archived_connection_response"), CONNECTIONS_URL, True),
        ("destination", pytest_cases.fixture_ref("upsert_destination_response"), DESTINATIONS_URL, False),
        ("destination", pytest_cases.fixture_ref("upsert_archived_destination_response"), DESTINATIONS_URL, True),
    ),
)
def test_upsert_auto_unarchive(entity_type, response_data, resource_url, auto_unarchive, now):
    responses.add(
        responses.PUT,
        resource_url,
        json=response_data,
        status=status.HTTP_200_OK,
    )
    responses.add(
        responses.PUT,
        f"{resource_url}/{response_data['id']}/unarchive",
        json=response_data | {"archived_at": None},
        status=status.HTTP_200_OK,
    )
    result = upsert(entity_type, {}, auto_unarchive=auto_unarchive)
    if auto_unarchive:
        assert result["archived_at"] is None
    else:
        assert result["archived_at"] == response_data["archived_at"]


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
@pytest_cases.parametrize(
    "entity_type,hookdeck_url,response_data",
    (
        ("connection", CONNECTIONS_URL, pytest_cases.fixture_ref("retrieve_connection_response")),
        ("destination", DESTINATIONS_URL, pytest_cases.fixture_ref("retrieve_destination_response")),
        ("source", SOURCES_URL, pytest_cases.fixture_ref("retrieve_source_response")),
    ),
)
def test_retrieve_happy_path(entity_type, hookdeck_url, response_data):
    responses.add(
        responses.GET,
        f"{hookdeck_url}/{response_data['id']}",
        json=response_data,
        status=status.HTTP_200_OK,
    )
    assert retrieve(entity_type, response_data["id"]) == response_data


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
@pytest_cases.parametrize(
    "search_fn,resource_url,response_data",
    (
        (search_connections, CONNECTIONS_URL, pytest_cases.fixture_ref("search_connections_response")),
        (search_connections, CONNECTIONS_URL, pytest_cases.fixture_ref("search_no_results_response")),
        (search_destinations, DESTINATIONS_URL, pytest_cases.fixture_ref("search_destinations_response")),
        (search_destinations, DESTINATIONS_URL, pytest_cases.fixture_ref("search_no_results_response")),
        (search_sources, SOURCES_URL, pytest_cases.fixture_ref("search_sources_response")),
        (search_sources, SOURCES_URL, pytest_cases.fixture_ref("search_no_results_response")),
    ),
)
def test_search_functionality(search_fn, resource_url, response_data):
    responses.add(responses.GET, resource_url, json=response_data)
    result = search_fn()
    assert set(result.keys()).issuperset({"pagination", "count", "models"})
    assert set(result["pagination"].keys()) == {"order_by", "dir", "limit"}


@responses.activate
@pytest.mark.parametrize(
    "search_fn,resource_url",
    (
        (search_connections, CONNECTIONS_URL),
        (search_destinations, DESTINATIONS_URL),
        (search_sources, SOURCES_URL),
    ),
)
def test_search_functionality_when_hookdeck_non_200(search_fn, resource_url):
    responses.add(responses.GET, resource_url, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    with pytest.raises(HookDeckIntegrationError):
        assert search_fn(name="something")


@responses.activate
@pytest_cases.parametrize(
    "entity_type,resource_url,response_data",
    (
        ("connection", CONNECTIONS_URL, pytest_cases.fixture_ref("archive_connection_response")),
        ("destination", DESTINATIONS_URL, pytest_cases.fixture_ref("archive_destination_response")),
    ),
)
def test_archive(entity_type, resource_url, response_data):
    responses.add(
        responses.PUT,
        f"{resource_url}/{response_data['id']}/archive",
        json=response_data,
        status=status.HTTP_200_OK,
    )
    assert archive(entity_type, response_data["id"]) == response_data


@responses.activate
@pytest.mark.parametrize(
    "entity_type,resource_url",
    (
        ("connection", CONNECTIONS_URL),
        ("destination", DESTINATIONS_URL),
    ),
)
def test_archive_when_hookdeck_non_200(entity_type, resource_url):
    id = "my-id"
    responses.add(
        responses.PUT,
        f"{resource_url}/{id}/archive",
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
    with pytest.raises(HookDeckIntegrationError):
        assert archive(entity_type, id)


@responses.activate
@pytest_cases.parametrize(
    "entity_type,resource_url,response_data",
    (
        ("connection", CONNECTIONS_URL, pytest_cases.fixture_ref("unarchive_connection_response")),
        ("destination", DESTINATIONS_URL, pytest_cases.fixture_ref("unarchive_destination_response")),
    ),
)
def test_unarchive(entity_type, resource_url, response_data):
    responses.add(
        responses.PUT,
        f"{resource_url}/{response_data['id']}/unarchive",
        json=response_data,
        status=status.HTTP_200_OK,
    )
    assert unarchive(entity_type, response_data["id"]) == response_data


@responses.activate
@pytest.mark.parametrize(
    "entity_type,resource_url",
    (
        ("connection", CONNECTIONS_URL),
        ("destination", DESTINATIONS_URL),
    ),
)
def test_unarchive_when_hookdeck_non_200(entity_type, resource_url):
    id = "my-id"
    responses.add(
        responses.PUT,
        f"{resource_url}/{id}/unarchive",
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
    with pytest.raises(HookDeckIntegrationError):
        assert unarchive(entity_type, id)


def test_bootstrap(mocker, settings):
    name = "name"
    contributions_webhook_url = f"{settings.SITE_URL}{reverse('stripe-webhooks-contributions')}"
    upgrades_webhook_url = f"{settings.SITE_URL}{reverse('organization-handle-stripe-webhook')}"
    mock_upsert_destination = mocker.patch(
        "apps.common.hookdeck.upsert_destination",
        side_effect=[{"id": (dest_1_id := "<destination-1-id>")}, {"id": (dest_2_id := "<destination-2-id>")}],
    )
    mock_upsert_connection = mocker.patch(
        "apps.common.hookdeck.upsert_connection",
        side_effect=[{"id": "<connection-1-id>"}, {"id": "<connection-2-id>"}],
    )
    bootstrap(name, webhooks_url_contributions=contributions_webhook_url, webhooks_url_upgrades=upgrades_webhook_url)
    assert mock_upsert_connection.call_count == 2
    assert mock_upsert_connection.call_args_list[0] == mocker.call(
        name, settings.HOOKDECK_STRIPE_WEBHOOK_SOURCE, dest_1_id
    )
    assert mock_upsert_connection.call_args_list[1] == mocker.call(
        name, settings.HOOKDECK_STRIPE_WEBHOOK_SOURCE, dest_2_id
    )
    assert mock_upsert_destination.call_count == 2

    assert mock_upsert_destination.call_args_list[0] == mocker.call(
        name=name,
        url=contributions_webhook_url,
    )
    assert mock_upsert_destination.call_args_list[1] == mocker.call(
        name=name,
        url=upgrades_webhook_url,
    )


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


def test_teardown_when_destinations_and_connections_not_found(monkeypatch, mocker):
    spy = mocker.spy(logger, "info")
    mock_search_destinations = Mock(return_value={"models": []})
    mock_search_connections = Mock(return_value={"models": []})
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
    assert spy.call_args_list[0][0] == ("No connections found for ticket with prefix %s", ticket_name)
    assert spy.call_args_list[1][0] == ("No destinations found for ticket with prefix %s", ticket_name)
