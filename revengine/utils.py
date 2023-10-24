from django.core.exceptions import ImproperlyConfigured

from google.auth.exceptions import MalformedError
from google.oauth2 import service_account


def ensure_gs_credentials(gs_service_account):
    """Google cloud storage needs application default credentials to be set. By default it will look in particular
    file location, but that cannot be guaranteed on Heroku in worker tasks. It can also get credentials from a GS_CREDENTIALS env var,
    and that will be accessible from worker tasks."""
    if not gs_service_account:
        raise ImproperlyConfigured("GS_SERVICE_ACCOUNT is not set")
    try:
        return service_account.Credentials.from_service_account_info(gs_service_account)
    except MalformedError:
        raise ImproperlyConfigured("Cannot load Google Storage service account credentials")
