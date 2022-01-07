from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.organizations.models import RevenueProgram


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("-s", "--slug", nargs="?", type=str)

    def handle(self, *args, **options):
        if not options["slug"]:
            raise CommandError('Missing required argument "slug, -s, --slug"')
        if not settings.STRIPE_LIVE_MODE:
            raise CommandError("This command can only be run when STRIPE_LIVE_MODE is true")

        revenue_program = RevenueProgram.objects.get(slug=options["slug"])
        revenue_program.stripe_create_apple_pay_domain()

        self.stdout.write(self.style.SUCCESS("Success"))
        self.stdout.write(self.style.SUCCESS(f"Domain verified: {revenue_program._get_host()}"))
        self.stdout.write(self.style.SUCCESS(f"For RevenueProgram: {revenue_program.name}"))
