from unittest import mock

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
    def test_logging(self, logged, status_code, data):
        response = mock.Mock(get=mock.Mock(return_value=data))
        response.status_code = status_code
        with mock.patch("apps.common.middleware.logger") as logger:
            t = LogFourHundredsMiddleware(lambda request: response)
            assert response == t(mock.Mock())
        assert logged == logger.debug.called
