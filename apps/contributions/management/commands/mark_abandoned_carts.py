from pathlib import Path

from django.core.management.base import BaseCommand

from apps.contributions.tasks import mark_abandoned_carts_as_abandoned


class Command(BaseCommand):
    """Run the mark_abandoned_carts_as_abandoned task."""

    @property
    def name(self):
        return Path(__file__).name

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO(f"Running `{self.name}`"))
        mark_abandoned_carts_as_abandoned()
        self.stdout.write(self.style.SUCCESS(f"`{self.name}` is done"))
