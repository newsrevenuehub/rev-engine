from django.apps import AppConfig


class PagesConfig(AppConfig):
    name = "apps.pages"

    def ready(self):
        import apps.pages.signals.handlers  # noqa
