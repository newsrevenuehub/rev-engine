from django.core.exceptions import ImproperlyConfigured

import pytest

from revengine.settings.base import __ensure_gs_credentials


@pytest.fixture(
    params=[
        ("minimally_valid_google_service_account_credentials", True, True),
        ("invalid_google_service_account_credentials", True, False),
        ("invalid_google_service_account_credentials", False, False),
    ]
)
def __ensure_gs_credentials_test_case(request):
    return request.getfixturevalue(request.param[0]), request.param[1], request.param[2]


def test___ensure_gs_credentials(__ensure_gs_credentials_test_case):
    raw_value, raise_if_unset, expect_value = __ensure_gs_credentials_test_case
    if raise_if_unset:
        if expect_value:
            assert __ensure_gs_credentials(raw_value, raise_if_unset)
        else:
            with pytest.raises(ImproperlyConfigured):
                __ensure_gs_credentials(raw_value, raise_if_unset)
    else:
        if expect_value:
            assert __ensure_gs_credentials(raw_value, raise_if_unset)
        else:
            assert __ensure_gs_credentials(raw_value, raise_if_unset) is None
