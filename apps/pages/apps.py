from django.apps import AppConfig


class PagesConfig(AppConfig):
    name = "apps.pages"

    def ready(self):
        # Implicitly connect signal handlers decorated with @receiver.
        import apps.pages.signals  # noqa F401
