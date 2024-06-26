from pathlib import Path

from django.core.management.base import BaseCommand, CommandParser

from apps.e2e import FLOWS
from apps.e2e.tasks import do_ci_e2e_flow_run


class Command(BaseCommand):
    """Trigger async run of E2E checks.

    Defaults to checks in `FLOWS` dict.
    """

    @property
    def name(self):
        return Path(__file__).name

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--flows", nargs="*", default=FLOWS.keys())

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO(f"Running `{self.name} with flows: {options['flows']}`"))
        results = do_ci_e2e_flow_run(flows=options["flows"])
        self.stdout.write(self.style.SUCCESS(f"Results: {results}"))
