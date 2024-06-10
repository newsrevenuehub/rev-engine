import base64
import json

from django.core.exceptions import ImproperlyConfigured

from google.auth.exceptions import MalformedError
from google.oauth2 import service_account


def __ensure_gs_credentials(
    gs_service_account_raw: str = None,
    raise_on_unset: bool = False,
) -> service_account.Credentials | None:
    """Ensure that Google Storage service account credentials are available.

    This is a convenience function narrowly intended for use in settings file.

    There's enough complexity around how we're handling GS_CREDENTIALS in settings
    that it's worthwhile to put into a named function that we can test.
    """
    try:
        credentials = (
            service_account.Credentials.from_service_account_info(json.loads(base64.b64decode(gs_service_account_raw)))
            if gs_service_account_raw
            else None
        )
    except (json.decoder.JSONDecodeError, MalformedError):
        credentials = None

    if raise_on_unset and not credentials:
        raise ImproperlyConfigured("Cannot load Google Storage service account credentials")

    return credentials
