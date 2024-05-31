from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured

import pytest

from revengine.utils import __ensure_gs_credentials, get_bool_envvar


@pytest.fixture(
    params=[
        ("minimally_valid_google_service_account_credentials", True, True),
        ("invalid_google_service_account_credentials", True, False),
        ("invalid_google_service_account_credentials", False, False),
    ]
)
def ensure_gs_credentials_test_case(request):
    return request.getfixturevalue(request.param[0]), request.param[1], request.param[2]


def test___ensure_gs_credentials(ensure_gs_credentials_test_case):
    raw_value, raise_if_unset, expect_value = ensure_gs_credentials_test_case
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


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (" true", True),
        ("true ", True),
        ("true", True),
        ("True", True),
        ("TRUE", True),
        ("tRue", True),
        ("false", False),
        ("False", False),
        ("FALSE", False),
        ("fAlse", False),
    ],
)
def test_get_bool_envvar(value, expected):
    with patch("os.getenv", return_value=value):
        assert get_bool_envvar("ignored") == expected


@pytest.mark.parametrize(
    ("default", "expected"),
    [
        (True, True),
        (False, False),
        ("True", True),
        ("TRUE", True),
        ("true", True),
        ("tRue", True),
        ("False", False),
        ("FALSE", False),
        ("false", False),
        ("fAlse", False),
    ],
)
def test_get_bool_envvar_default(default, expected):
    with patch("os.getenv", return_value=default):
        assert get_bool_envvar("ignored", default) == expected


def test_get_bool_envvar_unset_exception():
    with pytest.raises(RuntimeError, match="Required environment variable"):
        get_bool_envvar("test_will_false_negative_if_this_is_set")


@pytest.mark.parametrize("value", ["", " ", "None1", "0", "test", "truthy", "utterlyfalse", "tr ue", None, 12])
def test_get_bool_envvar_not_truthy_exception(value):
    with (
        patch("os.getenv", return_value=value),
        pytest.raises(RuntimeError, match="Environment variable ignored must be"),
    ):
        get_bool_envvar("ignored")
