import os

from revengine.settings.dev import *  # noqa


# Override settings here
INSTALLED_APPS += (
    # show the styleguide in /cms/styleguide:
    "django_extensions",
)

ALLOWED_HOSTS = ["localhost", "172.20.1.211"]

CSRF_TRUSTED_ORIGINS = [
    "http://*.localhost",
    "http://*.127.0.0.1",
    "http://*.revengine.com:3000",
    "http://localhost:3000",
    "https://dashboard.stripe.com/",
    "https://*.stripe.com/",
]

SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "false").lower() == "true"
