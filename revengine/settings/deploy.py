import logging
import os
from pathlib import Path

from revengine.settings.base import *  # noqa: F403


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

EMAIL_SUBJECT_PREFIX = "[revengine %s] " % ENVIRONMENT.title()
DEFAULT_FROM_EMAIL = f"noreply@{os.getenv('DOMAIN', 'example.com')}"
SERVER_EMAIL = DEFAULT_FROM_EMAIL


### Google Cloud Storage ###
GS_BUCKET_NAME = os.getenv("GS_BUCKET_NAME", "rev-engine-media")
DEFAULT_FILE_STORAGE = "storages.backends.gcloud.GoogleCloudStorage"
GS_PROJECT_ID = os.getenv("GS_PROJECT_ID", "revenue-engine")
# https://django-storages.readthedocs.io/en/latest/backends/gcloud.html#settings
GS_QUERYSTRING_AUTH = False
GS_DEFAULT_ACL = None
# Media files are stored in a 'media' directory
GS_MEDIA_LOCATION = "media"

### React SPA index.html
FRONTEND_BUILD_DIR = Path(BASE_DIR) / "build"
TEMPLATES[0]["DIRS"] = [FRONTEND_BUILD_DIR, os.path.join(PROJECT_DIR, "templates")]
STATICFILES_DIRS = [os.path.join(PROJECT_DIR, "static"), str(FRONTEND_BUILD_DIR / "static")]

### HTTPS

CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "True") == "True"
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "True") == "True"

### Performance optimizations

REDIS_URL = os.getenv("REDIS_TLS_URL", os.getenv("REDIS_URL", "redis://redis:6379"))

CACHE_HOST = REDIS_URL
CONNECTION_POOL_KWARGS = {}
if CACHE_HOST.startswith("rediss"):
    import ssl

    # See: https://github.com/mirumee/saleor/issues/6926
    CONNECTION_POOL_KWARGS = {
        "ssl_cert_reqs": ssl.CERT_NONE,
    }

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": f"{CACHE_HOST}/0",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "CONNECTION_POOL_KWARGS": CONNECTION_POOL_KWARGS,
        },
    }
}
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
CELERY_RESULT_BACKEND = f"{REDIS_URL}/1"

CELERYBEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_HIJACK_ROOT_LOGGER = False

### 3rd-party appplications
if SENTRY_ENABLE_BACKEND and SENTRY_DSN_BACKEND:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration, ignore_logger

    sentry_logging = LoggingIntegration(
        level=logging.DEBUG,
        event_level=logging.WARNING,
    )  # Capture debug and above as breadcrumbs
    sentry_sdk.init(
        dsn=SENTRY_DSN_BACKEND,
        integrations=[sentry_logging, DjangoIntegration()],
        environment=ENVIRONMENT,
    )
    ignore_logger("django.security.DisallowedHost")


USE_DEBUG_INTERVALS = os.getenv("USE_DEBUG_INTERVALS", False)
