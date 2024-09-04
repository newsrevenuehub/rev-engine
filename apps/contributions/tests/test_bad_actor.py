import pytest
import requests

from apps.contributions.bad_actor import BadActorAPIError, JSONDecodeError, get_bad_actor_score


class Test_get_bad_actor_score:

    def setup_response(self, mocker, overall_score, settings, side_effect=None):
        original_post = requests.post

        def conditional_mock(url, *args, **kwargs):
            if settings.BAD_ACTOR_API_URL in url:
                response = mocker.Mock(status_code=200)
                response.json.return_value = overall_score.dict()
                if side_effect:
                    response.json.side_effect = side_effect
                return response
            return original_post(url, *args, **kwargs)

        return mocker.patch("requests.post", side_effect=conditional_mock)

    @pytest.fixture
    def response_post_good(self, mocker, bad_actor_good_score, settings):
        """Mock the requests.post function iff it's a request to the BAD_ACTOR_API_URL."""
        return self.setup_response(mocker, bad_actor_good_score, settings)

    @pytest.fixture
    def response_post_json_decode_error(self, mocker, bad_actor_good_score, settings):
        """Mock the requests.post function iff it's a request to the BAD_ACTOR_API_URL."""
        return self.setup_response(mocker, bad_actor_good_score, settings, JSONDecodeError("whoops", "[]", 0))

    @pytest.fixture
    def _settings_good(self, settings):
        settings.BAD_ACTOR_API_URL = "https://example.com"
        settings.BAD_ACTOR_API_KEY = "123"

    def test_throws_error_when_missing_key(self, settings):
        settings.BAD_ACTOR_API_KEY = None
        with pytest.raises(BadActorAPIError, match="BAD_ACTOR_API_KEY not set"):
            get_bad_actor_score({})

    def test_throws_error_when_missing_url(self, settings):
        settings.BAD_ACTOR_API_URL = None
        with pytest.raises(BadActorAPIError, match="BAD_ACTOR_API_URL not set"):
            get_bad_actor_score({})

    @pytest.mark.usefixtures("_settings_good", "response_post_good")
    def test_happy_path(self, bad_actor_good_score):
        assert get_bad_actor_score({}) == bad_actor_good_score

    @pytest.mark.usefixtures(
        "_settings_good",
        "response_post_json_decode_error",
    )
    def test_when_json_decode_error_in_response(self):
        with pytest.raises(BadActorAPIError, match="malformed JSON"):
            get_bad_actor_score({})

    @pytest.mark.parametrize(
        "exception",
        [Exception, requests.RequestException, requests.HTTPError, requests.ConnectionError, requests.Timeout],
    )
    def test_when_errors_with_request(self, exception, mocker):
        mocker.patch("requests.post", side_effect=exception("whoops"))
        with pytest.raises(BadActorAPIError, match="BadActor API request failed"):
            get_bad_actor_score({})
