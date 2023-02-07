from django.core.management.base import BaseCommand


class Command(BaseCommand):
    def add_arguments(self, parser):
        pass

    def handle(self, *args, **options):
        # webhook_url = options["url"] if options.get("url") else settings.SITE_URL + reverse("stripe-webhooks")
        # self.stdout.write(self.style.SUCCESS(""))
        pass
