from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandParser
from django.urls import reverse


import requests

from apps.e2e import TESTS


class Command(BaseCommand):
    """"""

    help = ""

    @property
    def name(self):
        return Path(__file__).name

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--tests", nargs="*", default=TESTS.keys())
        parser.add_argument("--report-results", action="store_true", default=False)

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO(f"Running `{self.name}`"))
        url = f"{settings.SITE_URL}{reverse('e2e:e2e-trigger-tests')}"
        response = requests.post(url, data={"tests": options["tests"], "report_results": options["report_results"]})
        response.raise_for_status()
        self.stdout.write(self.style.SUCCESS("`{self.name}` is done"))
