import os
from pathlib import Path

from .base import *  # noqa


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
    EMAIL_BACKEND = "anymail.backends.mailgun.EmailBackend"
    ANYMAIL = {
        "MAILGUN_API_KEY": os.getenv("MAILGUN_API_KEY", ""),
    }
    DEFAULT_FROM_EMAIL = "noreply@fundjournalism.org"


# Celery
BROKER_URL = "redis://localhost:6379"
CELERY_RESULT_BACKEND = "redis://localhost:6379"
CELERY_IMPORTS = ("apps.emails.tasks",)

# Serve SPA via django
FRONTEND_BUILD_DIR = Path(BASE_DIR) / "spa/public"
TEMPLATES[0]["DIRS"] = [FRONTEND_BUILD_DIR, os.path.join(PROJECT_DIR, "templates")]
