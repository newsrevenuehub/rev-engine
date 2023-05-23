from django.apps import AppConfig


class OrganizationsConfig(AppConfig):
    name = "apps.organizations"

    def ready(self):
        # Implicitly connect signal handlers decorated with @receiver.
        import apps.organizations.signals  # noqa F401
