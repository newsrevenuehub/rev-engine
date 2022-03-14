from django.core.management.base import BaseCommand  # pragma: no cover


class Command(BaseCommand):  # pragma: no cover
    help = "Bootstrap Heroku review app"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Bootstrapped review app"))
