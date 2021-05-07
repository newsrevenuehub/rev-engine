from django.conf import settings  # pragma: no cover
from django.contrib.auth import get_user_model  # pragma: no cover
from django.core.management.base import BaseCommand  # pragma: no cover


class Command(BaseCommand):  # pragma: no cover
    help = "Bootstrap Heroku review app"

    def handle(self, *args, **options):
        User = get_user_model()
        qatester_exists = User.objects.filter(email="qatester@example.com").exists()
        if settings.ENVIRONMENT != "review" or qatester_exists:
            self.stdout.write("**Not running bootstrap tasks**")
            return
        User.objects.create_superuser(email="qatester@example.com", password="qatester")
        self.stdout.write(self.style.SUCCESS("Successfully created qatester"))
