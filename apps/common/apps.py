from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = "apps.common"

    def ready(self):
        """Import signals file, so signals are called."""
        import apps.common.signals  # noqa
