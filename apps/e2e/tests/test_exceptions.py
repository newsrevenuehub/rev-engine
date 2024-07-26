from apps.e2e.exceptions import E2EError


def test_e2e_error():
    E2EError("test error")
