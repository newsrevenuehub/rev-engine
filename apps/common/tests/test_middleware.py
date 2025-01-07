from django.conf import settings

import pytest

from apps.common.middleware import LogFourHundredsMiddleware


class TestLogFourHundredsMiddleware:
    @pytest.mark.parametrize(
        ("logged", "status_code", "data"),
        [
            (False, "200", {}),
            (False, settings.MIDDLEWARE_LOGGING_CODES[0], {}),
            (True, settings.MIDDLEWARE_LOGGING_CODES[0], {"foo": "bar"}),
        ],
    )
    def test_logging(self, logged, status_code, data, mocker):
        response = mocker.Mock(get=mocker.Mock(return_value=data))
        response.status_code = status_code
        logger = mocker.patch("apps.common.middleware.logger")
        t = LogFourHundredsMiddleware(lambda request: response)
        assert response == t(mocker.Mock())
        assert logged == logger.debug.called
