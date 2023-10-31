from django.core.exceptions import ImproperlyConfigured

import pytest

from revengine.settings.base import ensure_gs_credentials


@pytest.fixture
def minimally_valid_gs_service_account():
    """This is a subset of the service account JSON. If any of these key/vals are missing,
    `service_account.Credentials.from_service_account_info`
    """
    return {
        # NB: normally we don't store private keys, but this is dummy data and okay to commit.
        # We have to exclude this entire file in `.pre-commit-config.yaml` to avoid a detect-private-key error
        "private_key": (
            "-----BEGIN "
            + "PRIVATE KEY-----\n"
            + "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDY3E8o1NEFcjMM\n"
            + "HW/5ZfFJw29/8NEqpViNjQIx95Xx5KDtJ+nWn9+OW0uqsSqKlKGhAdAo+Q6bjx2c\n"
            + "uXVsXTu7XrZUY5Kltvj94DvUa1wjNXs606r/RxWTJ58bfdC+gLLxBfGnB6CwK0YQ\n"
            + "xnfpjNbkUfVVzO0MQD7UP0Hl5ZcY0Puvxd/yHuONQn/rIAieTHH1pqgW+zrH/y3c\n"
            + "59IGThC9PPtugI9ea8RSnVj3PWz1bX2UkCDpy9IRh9LzJLaYYX9RUd7++dULUlat\n"
            + "AaXBh1U6emUDzhrIsgApjDVtimOPbmQWmX1S60mqQikRpVYZ8u+NDD+LNw+/Eovn\n"
            + "xCj2Y3z1AgMBAAECggEAWDBzoqO1IvVXjBA2lqId10T6hXmN3j1ifyH+aAqK+FVl\n"
            + "GjyWjDj0xWQcJ9ync7bQ6fSeTeNGzP0M6kzDU1+w6FgyZqwdmXWI2VmEizRjwk+/\n"
            + "/uLQUcL7I55Dxn7KUoZs/rZPmQDxmGLoue60Gg6z3yLzVcKiDc7cnhzhdBgDc8vd\n"
            + "QorNAlqGPRnm3EqKQ6VQp6fyQmCAxrr45kspRXNLddat3AMsuqImDkqGKBmF3Q1y\n"
            + "xWGe81LphUiRqvqbyUlh6cdSZ8pLBpc9m0c3qWPKs9paqBIvgUPlvOZMqec6x4S6\n"
            + "ChbdkkTRLnbsRr0Yg/nDeEPlkhRBhasXpxpMUBgPywKBgQDs2axNkFjbU94uXvd5\n"
            + "znUhDVxPFBuxyUHtsJNqW4p/ujLNimGet5E/YthCnQeC2P3Ym7c3fiz68amM6hiA\n"
            + "OnW7HYPZ+jKFnefpAtjyOOs46AkftEg07T9XjwWNPt8+8l0DYawPoJgbM5iE0L2O\n"
            + "x8TU1Vs4mXc+ql9F90GzI0x3VwKBgQDqZOOqWw3hTnNT07Ixqnmd3dugV9S7eW6o\n"
            + "U9OoUgJB4rYTpG+yFqNqbRT8bkx37iKBMEReppqonOqGm4wtuRR6LSLlgcIU9Iwx\n"
            + "yfH12UWqVmFSHsgZFqM/cK3wGev38h1WBIOx3/djKn7BdlKVh8kWyx6uC8bmV+E6\n"
            + "OoK0vJD6kwKBgHAySOnROBZlqzkiKW8c+uU2VATtzJSydrWm0J4wUPJifNBa/hVW\n"
            + "dcqmAzXC9xznt5AVa3wxHBOfyKaE+ig8CSsjNyNZ3vbmr0X04FoV1m91k2TeXNod\n"
            + "jMTobkPThaNm4eLJMN2SQJuaHGTGERWC0l3T18t+/zrDMDCPiSLX1NAvAoGBAN1T\n"
            + "VLJYdjvIMxf1bm59VYcepbK7HLHFkRq6xMJMZbtG0ryraZjUzYvB4q4VjHk2UDiC\n"
            + "lhx13tXWDZH7MJtABzjyg+AI7XWSEQs2cBXACos0M4Myc6lU+eL+iA+OuoUOhmrh\n"
            + "qmT8YYGu76/IBWUSqWuvcpHPpwl7871i4Ga/I3qnAoGBANNkKAcMoeAbJQK7a/Rn\n"
            + "wPEJB+dPgNDIaboAsh1nZhVhN5cvdvCWuEYgOGCPQLYQF0zmTLcM+sVxOYgfy8mV\n"
            + "fbNgPgsP5xmu6dw2COBKdtozw0HrWSRjACd1N4yGu75+wPCcX/gQarcjRcXXZeEa\n"
            + "NtBLSfcqPULqD+h7br9lEJio\n"
            + "-----END PRIVATE KEY-----\n"
        ),
        "client_email": "123-abc@developer.gserviceaccount.com",
        "token_uri": "http://localhost:8080/token",
    }


@pytest.fixture(
    params=[
        {"get_value": lambda x: None, "raise_on_unset": True, "expect_error": True},
        {"get_value": lambda x: {}, "raise_on_unset": False, "expect_error": False},
        {"get_value": lambda x: {"foo": "bar"}, "raise_on_unset": False, "expect_error": True},
        {"get_value": lambda x: {"foo": "bar"}, "raise_on_unset": True, "expect_error": True},
        {"get_value": lambda x: "", "raise_on_unset": True, "expect_error": True},
        {"get_value": lambda x: "", "raise_on_unset": False, "expect_error": False},
        {
            "get_value": lambda x: x.getfixturevalue("minimally_valid_gs_service_account"),
            "raise_on_unset": True,
            "expect_error": False,
        },
        {
            "get_value": lambda x: x.getfixturevalue("minimally_valid_gs_service_account"),
            "raise_on_unset": False,
            "expect_error": False,
        },
    ]
)
def ensure_gs_credentials_case(request, settings):
    return request.param["get_value"](request), request.param["raise_on_unset"], request.param["expect_error"]


def test_ensure_gs_credentials(ensure_gs_credentials_case):
    val, settings_raise_on_unset, expect_error = ensure_gs_credentials_case
    if expect_error:
        with pytest.raises(ImproperlyConfigured):
            ensure_gs_credentials(val, raise_error_on_gs_service_account_unset=settings_raise_on_unset)
    else:
        ensure_gs_credentials(val, raise_error_on_gs_service_account_unset=settings_raise_on_unset)
