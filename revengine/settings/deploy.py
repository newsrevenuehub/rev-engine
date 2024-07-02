import logging
import os
from pathlib import Path

from .base import *  # noqa: F403


# For more information about deploy settings, see:
# See https://docs.djangoproject.com/en/dev/howto/deployment/checklist/

#### Critical settings

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")

### Environment-specific settings
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost").split(":")

## Email
EMAIL_BACKEND = "anymail.backends.mailgun.EmailBackend"
MAILGUN_SENDER_DOMAIN = "fundjournalism.org"

ANYMAIL = {
    "MAILGUN_API_KEY": os.getenv("MAILGUN_API_KEY", ""),
    "MAILGUN_SENDER_DOMAIN": MAILGUN_SENDER_DOMAIN,
}

EMAIL_SUBJECT_PREFIX = f"[revengine {ENVIRONMENT.title()}] "
DEFAULT_FROM_EMAIL = f"noreply@{os.getenv('DOMAIN', 'example.com')}"
SERVER_EMAIL = DEFAULT_FROM_EMAIL


### Google Cloud Storage ###
STORAGES = {
    # Store user-uploaded files in Google Cloud.
    "default": {
        "BACKEND": "storages.backends.gcloud.GoogleCloudStorage",
        # https://django-storages.readthedocs.io/en/latest/backends/gcloud.html#settings
        "OPTIONS": {
            "bucket_name": os.getenv("GS_BUCKET_NAME", "rev-engine-media"),
            "location": os.getenv("GS_LOCATION", "media"),
            "project_id": os.getenv("GS_PROJECT_ID", "revenue-engine"),
            "querystring_auth": False,
            "credentials": GS_CREDENTIALS,
            "default_acl": None,
        },
    },
    # Store static files, like SPA assets, locally.
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

### React SPA index.html
FRONTEND_BUILD_DIR = Path(BASE_DIR) / "build"
TEMPLATES[0]["DIRS"] = [FRONTEND_BUILD_DIR, str(PROJECT_DIR / "templates")]
STATICFILES_DIRS = [PROJECT_DIR / "static", str(FRONTEND_BUILD_DIR / "static")]

### HTTPS

CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "True") == "True"
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "True") == "True"


SESSION_ENGINE = "django.contrib.sessions.backends.cache"

# Use template caching on deployed servers
for backend in TEMPLATES:
    if backend["BACKEND"] == "django.template.backends.django.DjangoTemplates":
        default_loaders = ["django.template.loaders.filesystem.Loader"]
        if backend.get("APP_DIRS", False):
            default_loaders.append("django.template.loaders.app_directories.Loader")
            # Django gets annoyed if you both set APP_DIRS True and specify your own loaders
            backend["APP_DIRS"] = False
        loaders = backend["OPTIONS"].get("loaders", default_loaders)
        for loader in loaders:
            if len(loader) == 2 and loader[0] == "django.template.loaders.cached.Loader":
                # We're already caching our templates
                break
        else:
            backend["OPTIONS"]["loaders"] = [("django.template.loaders.cached.Loader", loaders)]

# Celery

BROKER_URL = f"{REDIS_URL}/1"
if BROKER_URL.startswith("rediss"):
    import ssl

    # See: https://github.com/mirumee/saleor/issues/6926
    BROKER_USE_SSL = {
        "ssl_cert_reqs": ssl.CERT_NONE,
    }
    CELERY_REDIS_BACKEND_USE_SSL = {
        "ssl_cert_reqs": ssl.CERT_NONE,
    }

CELERYBEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_HIJACK_ROOT_LOGGER = False

### 3rd-party appplications
if SENTRY_ENABLE_BACKEND and SENTRY_DSN_BACKEND:
    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration, ignore_logger
    from sentry_sdk.integrations.redis import RedisIntegration

    sentry_logging = LoggingIntegration(
        level=logging.DEBUG,
        event_level=logging.WARNING,
    )  # Capture debug and above as breadcrumbs.
    sentry_sdk.init(
        dsn=SENTRY_DSN_BACKEND,
        integrations=[
            sentry_logging,
            CeleryIntegration(),  # https://docs.sentry.io/platforms/python/guides/celery/
            DjangoIntegration(),  # https://docs.sentry.io/platforms/python/guides/django/
            RedisIntegration(),  # https://docs.sentry.io/platforms/python/configuration/integrations/redis/
        ],
        send_default_pii=SENTRY_ENABLE_PII,
        environment=ENVIRONMENT,
        # TODO @njh: After testing will want to reduce this to less than 100% sampling rate.
        # DEV-2683
        # https://docs.sentry.io/platforms/python/configuration/sampling/#setting-a-uniform-sample-rate
        traces_sample_rate=1.0,
        profiles_sample_rate=SENTRY_PROFILING_SAMPLE_RATE,
    )
    ignore_logger("django.security.DisallowedHost")


USE_DEBUG_INTERVALS = os.getenv("USE_DEBUG_INTERVALS", False)
