from revengine.settings.dev import *  # noqa


# Override settings here
INSTALLED_APPS += (
    # show the styleguide in /cms/styleguide:
    "django_extensions",
)

ALLOWED_HOSTS = ["localhost", "172.20.1.211"]

SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", False)
