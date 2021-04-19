from revengine.settings.dev import *  # noqa


# Override settings here
INSTALLED_APPS += (
    # 'debug_toolbar',
    # show the styleguide in /cms/styleguide:
    "django_extensions",
)

ALLOWED_HOSTS = ["localhost", "172.20.1.211"]
