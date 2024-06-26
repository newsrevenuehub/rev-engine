from pathlib import Path

from django.core.management.base import BaseCommand, CommandParser

from apps.e2e import TESTS
from apps.e2e.tasks import do_ci_e2e_flow_run


class Command(BaseCommand):
    """Trigger async run of E2E tests.

    Defaults to tests in `TESTS` dict.

    """

    @property
    def name(self):
        return Path(__file__).name

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--tests", nargs="*", default=TESTS.keys())

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO(f"Running `{self.name} with tests: {options['tests']}`"))
        results = do_ci_e2e_flow_run(tests=options["tests"])
        self.stdout.write(self.style.SUCCESS(f"Results: {results}"))
