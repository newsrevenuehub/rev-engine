from django.apps import AppConfig


class UsersConfig(AppConfig):
    name = "apps.users"

    def ready(self):
        # Implicitly connect signal handlers decorated with @receiver.
        import apps.users.signals  # noqa F401
