from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Bootstrap Heroku review app"

    def handle(self, *args, **options):
        if settings.ENVIRONMENT != "review":
            return
        User = get_user_model()
        User.objects.create_superuser(email="qatester@example.com", password="qatester")
        self.stdout.write(self.style.SUCCESS("Successfully created qatester"))
