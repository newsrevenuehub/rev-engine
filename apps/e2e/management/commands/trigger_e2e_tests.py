from pathlib import Path

from django.core.management.base import BaseCommand, CommandParser

from apps.e2e import TESTS
from apps.e2e.tasks import do_ci_e2e_test_run


class Command(BaseCommand):
    """Trigger async run of E2E tests.

    Defaults to tests in `TESTS` dict.

    Boolean flag to determine if results should be reported.
    """

    @property
    def name(self):
        return Path(__file__).name

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--tests", nargs="*", default=TESTS.keys())
        parser.add_argument("--report-results", action="store_true", default=False)

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO(f"Running `{self.name}`"))
        do_ci_e2e_test_run.delay(tests=options["tests"], report_results=options["report_results"])
        self.stdout.write(self.style.SUCCESS("`{self.name}` is done"))
