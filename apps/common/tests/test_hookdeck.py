import json
from pathlib import Path

from django.urls import reverse

import pytest
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


@pytest.fixture()
def upsert_connection_response():
    with Path("apps/common/tests/fixtures/hookdeck-upsert-connection-success.json").open() as f:
        return json.load(f)


@pytest.fixture()
def upsert_archived_connection_response():
    with Path("apps/common/tests/fixtures/hookdeck-upsert-connection-when-archived.json").open() as f:
        return json.load(f)


@pytest.fixture()
def upsert_destination_response():
    with Path("apps/common/tests/fixtures/hookdeck-upsert-destination-success.json").open() as f:
        return json.load(f)


@pytest.fixture()
def upsert_archived_destination_response():
    with Path("apps/common/tests/fixtures/hookdeck-upsert-destination-when-archived.json").open() as f:
        return json.load(f)


@pytest.fixture()
def retrieve_connection_response():
    with Path("apps/common/tests/fixtures/hookdeck-retrieve-connection.json").open() as f:
        return json.load(f)


@pytest.fixture()
def retrieve_destination_response():
    with Path("apps/common/tests/fixtures/hookdeck-retrieve-destination.json").open() as f:
        return json.load(f)


@pytest.fixture()
def retrieve_source_response():
    with Path("apps/common/tests/fixtures/hookdeck-retrieve-source.json").open() as f:
        return json.load(f)


@pytest.fixture()
def search_connections_response():
    with Path("apps/common/tests/fixtures/hookdeck-search-connections.json").open() as f:
        return json.load(f)


@pytest.fixture()
def search_destinations_response():
    with Path("apps/common/tests/fixtures/hookdeck-search-destinations.json").open() as f:
        return json.load(f)


@pytest.fixture()
def search_sources_response():
    with Path("apps/common/tests/fixtures/hookdeck-search-sources.json").open() as f:
        return json.load(f)


@pytest.fixture()
def search_no_results_response():
    with Path("apps/common/tests/fixtures/hookdeck-search-no-results.json").open() as f:
        return json.load(f)


@pytest.fixture()
def archive_connection_response():
    with Path("apps/common/tests/fixtures/hookdeck-archive-connection.json").open() as f:
        return json.load(f)


@pytest.fixture()
def archive_destination_response():
    with Path("apps/common/tests/fixtures/hookdeck-archive-destination.json").open() as f:
        return json.load(f)


@pytest.fixture()
def unarchive_destination_response():
    with Path("apps/common/tests/fixtures/hookdeck-unarchive-destination.json").open() as f:
        return json.load(f)


@pytest.fixture()
def unarchive_connection_response():
    with Path("apps/common/tests/fixtures/hookdeck-unarchive-connection.json").open() as f:
        return json.load(f)


@pytest.fixture(
    params=[
        (
            "connection",
            {"name": "my-connection", "source_id": "<source-id>", "destination_id": "<destination-id>"},
            "upsert_connection_response",
        ),
        ("destination", {"name": "my-destination", "url": "https://www.somewhere.com"}, "upsert_destination_response"),
    ]
)
def upsert_happy_path_case(request):
    entity_type, data, response_data = request.param
    return entity_type, data, request.getfixturevalue(response_data)


@responses.activate
def test_upsert_happy_path(upsert_happy_path_case):
    entity_type, data, response_data = upsert_happy_path_case
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


@pytest.fixture(
    params=[
        ("connection", "upsert_connection_response", CONNECTIONS_URL, False),
        ("connection", "upsert_archived_connection_response", CONNECTIONS_URL, True),
        ("destination", "upsert_destination_response", DESTINATIONS_URL, False),
        ("destination", "upsert_archived_destination_response", DESTINATIONS_URL, True),
    ]
)
def upsert_auto_unarchive_case(request):
    entity_type, response_data, resource_url, auto_unarchive = request.param
    return entity_type, request.getfixturevalue(response_data), resource_url, auto_unarchive


@responses.activate
def test_upsert_auto_unarchive(upsert_auto_unarchive_case):
    entity_type, response_data, resource_url, auto_unarchive = upsert_auto_unarchive_case
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


@pytest.mark.parametrize("entity_type", ["connection", "destination"])
def test_upsert_when_hookdeck_not_200(entity_type):
    responses.add(
        responses.PUT,
        CONNECTIONS_URL if entity_type == "connection" else DESTINATIONS_URL,
        json={},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
    with pytest.raises(HookDeckIntegrationError):
        upsert(entity_type, {})


class TestUpsertDestination:
    def test_happy_path(self, mocker):
        kwargs = {"name": "my-destination", "url": "https://foo.bar"}
        mock_upsert = mocker.patch("apps.common.hookdeck.upsert")
        assert upsert_destination(**kwargs)
        mock_upsert.assert_called_once_with("destination", kwargs)

    def test_when_required_are_empty_strings(self, mocker):
        logger_spy = mocker.spy(logger, "warning")
        kwargs = {"name": "", "url": ""}
        mock_upsert = mocker.patch("apps.common.hookdeck.upsert")
        assert upsert_destination(**kwargs) is None
        mock_upsert.assert_not_called()
        for k in kwargs:
            assert k in logger_spy.call_args[0][1]


class TestUpsertConnection:
    def test_happy_path(self, mocker):
        kwargs = {"name": "my-connection", "source_id": "<some-source-id>", "destination_id": "<some-destination-id>"}
        mock_upsert = mocker.patch("apps.common.hookdeck.upsert")
        assert upsert_connection(**kwargs)
        mock_upsert.assert_called_once_with("connection", kwargs)

    def test_when_required_are_empty_strings(self, mocker):
        logger_spy = mocker.spy(logger, "warning")
        kwargs = {"name": "", "source_id": "", "destination_id": ""}
        mock_upsert = mocker.patch("apps.common.hookdeck.upsert")
        assert upsert_connection(**kwargs) is None
        mock_upsert.assert_not_called()
        for k in kwargs:
            assert k in logger_spy.call_args[0][1]


@pytest.fixture(
    params=[
        ("connection", CONNECTIONS_URL, "retrieve_connection_response"),
        ("destination", DESTINATIONS_URL, "retrieve_destination_response"),
        ("source", SOURCES_URL, "retrieve_source_response"),
    ]
)
def retrieve_happy_path_case(request):
    entity_type, resource_url, response_data = request.param
    return entity_type, resource_url, request.getfixturevalue(response_data)


@responses.activate
def test_retrieve_happy_path(retrieve_happy_path_case):
    entity_type, hookdeck_url, response_data = retrieve_happy_path_case
    responses.add(
        responses.GET,
        f"{hookdeck_url}/{response_data['id']}",
        json=response_data,
        status=status.HTTP_200_OK,
    )
    assert retrieve(entity_type, response_data["id"]) == response_data


@responses.activate
@pytest.mark.parametrize("entity_type", ["connection", "destination"])
def test_retrieve_when_hookdeck_not_200(entity_type):
    id_ = "<my-id>"
    responses.add(
        responses.GET,
        f"{CONNECTIONS_URL if entity_type == 'connection' else DESTINATIONS_URL}/{id_}",
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
    with pytest.raises(HookDeckIntegrationError):
        retrieve(entity_type, id_)


@responses.activate
@pytest.mark.parametrize("has_results", [True, False])
def test_search_connections(has_results):
    params = {
        "id_": "<some-id>",
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
    with Path(fixture_path).open() as f:
        fixture = json.load(f)

    responses.add(responses.GET, f"{CONNECTIONS_URL}", json=fixture)
    result = search_connections(**params)
    assert set(result.keys()).issuperset({"pagination", "count", "models"})
    assert set(result["pagination"].keys()) == {"order_by", "dir", "limit"}


@responses.activate
def test_search_connections_when_hookdeck_non_200():
    responses.add(responses.GET, f"{CONNECTIONS_URL}", status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    with pytest.raises(HookDeckIntegrationError):
        assert search_connections(name="something")


@pytest.fixture(
    params=[
        (search_connections, CONNECTIONS_URL, "search_connections_response"),
        (search_connections, CONNECTIONS_URL, "search_no_results_response"),
        (search_destinations, DESTINATIONS_URL, "search_destinations_response"),
        (search_destinations, DESTINATIONS_URL, "search_no_results_response"),
        (search_sources, SOURCES_URL, "search_sources_response"),
        (search_sources, SOURCES_URL, "search_no_results_response"),
    ]
)
def search_functionality_case(request):
    search_fn, resource_url, response_data = request.param
    return search_fn, resource_url, request.getfixturevalue(response_data)


@responses.activate
def test_search_functionality(search_functionality_case):
    search_fn, resource_url, response_data = search_functionality_case
    responses.add(responses.GET, resource_url, json=response_data)
    result = search_fn()
    assert set(result.keys()).issuperset({"pagination", "count", "models"})
    assert set(result["pagination"].keys()) == {"order_by", "dir", "limit"}


@responses.activate
@pytest.mark.parametrize(
    ("search_fn", "resource_url"),
    [
        (search_connections, CONNECTIONS_URL),
        (search_destinations, DESTINATIONS_URL),
        (search_sources, SOURCES_URL),
    ],
)
def test_search_functionality_when_hookdeck_non_200(search_fn, resource_url):
    responses.add(responses.GET, resource_url, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    with pytest.raises(HookDeckIntegrationError):
        assert search_fn(name="something")


@pytest.fixture(
    params=[
        ("connection", CONNECTIONS_URL, "archive_connection_response"),
        ("destination", DESTINATIONS_URL, "archive_destination_response"),
    ]
)
def archive_happy_path_case(request):
    entity_type, resource_url, response_data = request.param
    return entity_type, resource_url, request.getfixturevalue(response_data)


@responses.activate
def test_archive(archive_happy_path_case):
    entity_type, resource_url, response_data = archive_happy_path_case
    responses.add(
        responses.PUT,
        f"{resource_url}/{response_data['id']}/archive",
        json=response_data,
        status=status.HTTP_200_OK,
    )
    assert archive(entity_type, response_data["id"]) == response_data


@responses.activate
@pytest.mark.parametrize(
    ("entity_type", "resource_url"),
    [
        ("connection", CONNECTIONS_URL),
        ("destination", DESTINATIONS_URL),
    ],
)
def test_archive_when_hookdeck_non_200(entity_type, resource_url):
    id_ = "my-id"
    responses.add(
        responses.PUT,
        f"{resource_url}/{id_}/archive",
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
    with pytest.raises(HookDeckIntegrationError):
        assert archive(entity_type, id_)


@pytest.fixture(
    params=[
        ("connection", CONNECTIONS_URL, "unarchive_connection_response"),
        ("destination", DESTINATIONS_URL, "unarchive_destination_response"),
    ]
)
def unarchive_happy_path_case(request):
    entity_type, resource_url, response_data = request.param
    return entity_type, resource_url, request.getfixturevalue(response_data)


@responses.activate
def test_unarchive(unarchive_happy_path_case):
    entity_type, resource_url, response_data = unarchive_happy_path_case
    responses.add(
        responses.PUT,
        f"{resource_url}/{response_data['id']}/unarchive",
        json=response_data,
        status=status.HTTP_200_OK,
    )
    assert unarchive(entity_type, response_data["id"]) == response_data


@responses.activate
@pytest.mark.parametrize(
    ("entity_type", "resource_url"),
    [
        ("connection", CONNECTIONS_URL),
        ("destination", DESTINATIONS_URL),
    ],
)
def test_unarchive_when_hookdeck_non_200(entity_type, resource_url):
    id_ = "my-id"
    responses.add(
        responses.PUT,
        f"{resource_url}/{id_}/unarchive",
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
    with pytest.raises(HookDeckIntegrationError):
        assert unarchive(entity_type, id_)


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
    expected_contributions_name = f"{name}-stripe-contributions"
    expected_upgrades_name = f"{name}-stripe-upgrades"
    assert mock_upsert_connection.call_args_list[0] == mocker.call(
        expected_contributions_name, settings.HOOKDECK_STRIPE_WEBHOOK_SOURCE_CONTRIBUTIONS, dest_1_id
    )
    assert mock_upsert_connection.call_args_list[1] == mocker.call(
        expected_upgrades_name, settings.HOOKDECK_STRIPE_WEBHOOK_SOURCE_UPGRADES, dest_2_id
    )
    assert mock_upsert_destination.call_count == 2

    assert mock_upsert_destination.call_args_list[0] == mocker.call(
        name=expected_contributions_name,
        url=contributions_webhook_url,
    )
    assert mock_upsert_destination.call_args_list[1] == mocker.call(
        name=expected_upgrades_name,
        url=upgrades_webhook_url,
    )


class TestTearDown:
    def test_happy_path(self, mocker):
        mock_search_destinations = mocker.patch(
            "apps.common.hookdeck.search_destinations",
            side_effect=[
                {
                    "models": [
                        {"id": "<destination-1-id>"},
                    ]
                },
                {
                    "models": [
                        {"id": "<destination-2-id>"},
                    ]
                },
            ],
        )
        mock_search_connections = mocker.patch(
            "apps.common.hookdeck.search_connections",
            side_effect=[
                {
                    "models": [
                        {"id": "<connection-1-id>"},
                    ]
                },
                {
                    "models": [
                        {"id": "<connection-2-id>"},
                    ]
                },
            ],
        )
        mock_archive = mocker.patch("apps.common.hookdeck.archive")
        ticket_name = "my-unique-ticket-name"
        tear_down(ticket_name)
        assert mock_search_destinations.call_count == 2
        assert mock_search_destinations.call_args_list[0] == mocker.call(name=f"{ticket_name}-stripe-contributions")
        assert mock_search_destinations.call_args_list[1] == mocker.call(name=f"{ticket_name}-stripe-upgrades")
        assert mock_search_connections.call_count == 2

        assert mock_search_connections.call_args_list[0] == mocker.call(name=f"{ticket_name}-stripe-contributions")
        assert mock_search_connections.call_args_list[1] == mocker.call(name=f"{ticket_name}-stripe-upgrades")
        assert mock_archive.call_count == 4
        assert mock_archive.call_args_list[0] == mocker.call("connection", "<connection-1-id>")
        assert mock_archive.call_args_list[1] == mocker.call("connection", "<connection-2-id>")
        assert mock_archive.call_args_list[2] == mocker.call("destination", "<destination-1-id>")
        assert mock_archive.call_args_list[3] == mocker.call("destination", "<destination-2-id>")

    def test_when_no_conns_found(self, mocker):
        mock_search_destinations = mocker.patch(
            "apps.common.hookdeck.search_destinations",
            side_effect=[
                {
                    "models": [
                        {"id": "<destination-1-id>"},
                    ]
                },
                {
                    "models": [
                        {"id": "<destination-2-id>"},
                    ]
                },
            ],
        )
        mock_search_connections = mocker.patch(
            "apps.common.hookdeck.search_connections",
            side_effect=[
                {"models": []},
                {"models": []},
            ],
        )
        mock_archive = mocker.patch("apps.common.hookdeck.archive")
        ticket_name = "my-unique-ticket-name"
        tear_down(ticket_name)
        assert mock_search_destinations.call_count == 2
        assert mock_search_connections.call_count == 2
        assert mock_archive.call_count == 2
        assert mock_archive.call_args_list[0] == mocker.call("destination", "<destination-1-id>")
        assert mock_archive.call_args_list[1] == mocker.call("destination", "<destination-2-id>")

    def test_when_no_dests_found(self, mocker):
        mock_search_connections = mocker.patch(
            "apps.common.hookdeck.search_connections",
            side_effect=[
                {
                    "models": [
                        {"id": "<connection-1-id>"},
                    ]
                },
                {
                    "models": [
                        {"id": "<connection-2-id>"},
                    ]
                },
            ],
        )
        mock_search_destinations = mocker.patch(
            "apps.common.hookdeck.search_destinations",
            side_effect=[
                {"models": []},
                {"models": []},
            ],
        )
        mock_archive = mocker.patch("apps.common.hookdeck.archive")
        ticket_name = "my-unique-ticket-name"
        tear_down(ticket_name)
        assert mock_search_destinations.call_count == 2
        assert mock_search_connections.call_count == 2
        assert mock_archive.call_count == 2
        assert mock_archive.call_args_list[0] == mocker.call("connection", "<connection-1-id>")
        assert mock_archive.call_args_list[1] == mocker.call("connection", "<connection-2-id>")
