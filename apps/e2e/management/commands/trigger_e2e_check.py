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
        parser.add_argument("--flow", required=True, choices=FLOWS.keys(), help="E2E flow to run")
        parser.add_argument("--commit-sha", required=False, help="Commit SHA to run the flow against")
        parser.add_argument("--report-results", action="store_true", help="Report results to GitHub", default=False)
        parser.add_argument("--async", action="store_true", help="Run the flow asynchronously", default=False)

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.HTTP_INFO(
                f"Running `{self.name} with flow {(flow:=options['flow'])} and commit sha `{options['commit_sha'] or '<none>'}"
            )
        )
        (do_ci_e2e_flow_run.delay if options["async"] else do_ci_e2e_flow_run)(
            flow, report_results=options["report_results"], commit_sha=options["commit_sha"]
        )
        self.stdout.write(self.style.SUCCESS("Done"))
