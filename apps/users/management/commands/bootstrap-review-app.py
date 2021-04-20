from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Bootstrap Heroku review app"

    def handle(self, *args, **options):
        User = get_user_model()
        qatester_exists = User.objects.filter(email="qatester@example.com").exists()
        if settings.ENVIRONMENT != "review" or qatester_exists:
            self.stdout.write("**Not running bootstrap tasks**")
            return
        User.objects.create_superuser(email="qatester@example.com", password="qatester")
        self.stdout.write(self.style.SUCCESS("Successfully created qatester"))
