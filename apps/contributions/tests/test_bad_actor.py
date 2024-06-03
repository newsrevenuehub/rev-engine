from unittest import mock

from django.test import override_settings

import pytest

from apps.contributions.bad_actor import BadActorAPIError, JSONDecodeError, make_bad_actor_request


@override_settings(BAD_ACTOR_API_KEY=None)
def test_bad_actor_throws_error_missing_key():
    with pytest.raises(BadActorAPIError, match="BAD_ACTOR_API_KEY not set"):
        make_bad_actor_request({})


@override_settings(BAD_ACTOR_API_URL=None)
def test_bad_actor_throws_error_missing_url():
    with pytest.raises(BadActorAPIError, match="BAD_ACTOR_API_URL not set"):
        make_bad_actor_request({})


@override_settings(BAD_ACTOR_API_URL="https://example.com")
@override_settings(BAD_ACTOR_API_KEY="123")
@mock.patch("requests.post")
def test_good_make_bad_actor_request(post):
    response = mock.Mock(status_code=200)
    post.return_value = response
    assert response == make_bad_actor_request({})


@override_settings(BAD_ACTOR_API_URL="https://example.com")
@override_settings(BAD_ACTOR_API_KEY="123")
@mock.patch("requests.post")
def test_badapi_make_bad_actor_request(post):
    post.return_value = mock.Mock(status_code=400, json=mock.Mock(return_value="mytestjson"))
    with pytest.raises(BadActorAPIError, match="mytestjson"):
        make_bad_actor_request({})


@override_settings(BAD_ACTOR_API_URL="https://example.com")
@override_settings(BAD_ACTOR_API_KEY="123")
@mock.patch("requests.post")
def test_badjson_make_bad_actor_request(post):
    post.return_value = mock.Mock(status_code=400, json=mock.Mock(side_effect=JSONDecodeError("whoops", "[]", 0)))
    with pytest.raises(BadActorAPIError, match="malformed JSON"):
        make_bad_actor_request({})
