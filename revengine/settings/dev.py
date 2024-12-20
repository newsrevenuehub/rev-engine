import os

from .base import *  # noqa: F403


DEBUG = True
SECRET_KEY = "m-u!e0jum^(+nt1+6@31+jl_zwc6yltugtv7%!2k(6l!c@=0n@"
SITE_URL = "https://example.com"
ALLOWED_HOSTS = ["*"]
INTERNAL_IPS = ("127.0.0.1",)

# Disable Django's own staticfiles handling in favour of WhiteNoise, for
# greater consistency between gunicorn and `./manage.py runserver`. See:
# http://whitenoise.evans.io/en/stable/django.html#using-whitenoise-in-development
INSTALLED_APPS.remove("django.contrib.staticfiles")
INSTALLED_APPS.extend(
    [
        "whitenoise.runserver_nostatic",
        "django.contrib.staticfiles",
    ]
)

# Set for testing
CONTRIBUTOR_MAGIC_LINK_REQUEST_THROTTLE_RATE = "1000/minute"

if os.getenv("DEBUG_TOOLBAR", "True") == "True":
    INSTALLED_APPS += [
        "debug_toolbar",
    ]
    MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]

# To test production email settings `export TEST_EMAIL=True`, otherwise emails will use the console backend.
if os.getenv("TEST_EMAIL", "False") == "True":
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.getenv("EMAIL_HOST")
    EMAIL_PORT = os.getenv("EMAIL_PORT")
    EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
    EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
    EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"
    DEFAULT_FROM_EMAIL = "noreply@fundjournalism.org"


# Celery
BROKER_URL = os.getenv("BROKER_URL", "memory://")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "cache")
CELERY_CACHE_BACKEND = BROKER_URL
CELERY_IMPORTS = ("apps.emails.tasks",)


CACHES["default"]["BACKEND"] = "django.core.cache.backends.locmem.LocMemCache"
