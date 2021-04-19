import os

from .base import *  # noqa


# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = "m-u!e0jum^(+nt1+6@31+jl_zwc6yltugtv7%!2k(6l!c@=0n@"

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

# SECURITY WARNING: define the correct hosts in production!
ALLOWED_HOSTS = ["*"]
INTERNAL_IPS = ("127.0.0.1",)

if os.getenv("DEBUG_TOOLBAR", "True") == "True":
    INSTALLED_APPS += [
        "debug_toolbar",
    ]
    MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
