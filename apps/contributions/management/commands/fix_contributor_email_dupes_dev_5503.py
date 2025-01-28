from pathlib import Path

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """Find recurring contributions affected by bug solved for in DEV-4783 and fix them by...

    ...setting donation_page to None and setting `._revenue_program` to the correct RevenueProgram.
    """

    @property
    def name(self):
        return Path(__file__).name

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO(f"Running `{self.name}`"))
        self.stdout.write(self.style.SUCCESS(f"`{self.name}` is done"))
