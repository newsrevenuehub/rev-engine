from django.core.exceptions import ImproperlyConfigured

from google.auth.exceptions import MalformedError
from google.oauth2 import service_account


def ensure_gs_credentials(gs_service_account, raise_error_on_gs_service_account_unset=True):
    """Google cloud storage needs application default credentials to be set. By default it will look in particular
    file location, but that cannot be guaranteed on Heroku in worker tasks. It can also get credentials from a GS_CREDENTIALS env var,
    and that will be accessible from worker tasks.


    NB: We have parametrized `raise_error_on_gs_service_account_unset` because we don't want to have to store dummy crednetials
    JSON blob ahead of testing mgirations. In CI, when our migrations test code runs we need to be able to not
    raise an error when the env var is not set. But in production, we want to raise an error if the env var is not set.
    """
    if not gs_service_account:
        if raise_error_on_gs_service_account_unset:
            raise ImproperlyConfigured("GS_SERVICE_ACCOUNT is not set")
        else:
            return None
    try:
        return service_account.Credentials.from_service_account_info(gs_service_account)
    except MalformedError:
        raise ImproperlyConfigured("Cannot load Google Storage service account credentials")
