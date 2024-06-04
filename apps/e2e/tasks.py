import subprocess
from dataclasses import dataclass
from enum import Enum

from django.conf import settings

from celery import shared_task
from celery.utils.log import get_task_logger
from e2e import TESTS


logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class TestOutcome(Enum):
    PASSED = "passed"
    FAILED = "failed"


@dataclass(frozen=True)
class E2ETest:

    name: str
    outcome: TestOutcome = None

    def __post_init__(self):
        if self.name not in TESTS:
            raise ValueError(f"Test {self.name} not found in available tests")

    def run(self) -> None:
        try:
            result = subprocess.run(["pytest", TESTS[self.name]], capture_output=True, text=True, check=False)
        except Exception:  # BLE001
            logger.exception("Test %s failed with uncaught error", self.name)
            self.outcome = TestOutcome.FAILED
        else:
            if result.returncode == 0:
                logger.info("Test %s passed", self.name)
                self.outcome = TestOutcome.PASSED
            else:
                logger.warning("Test %s failed with output: %s", self.name, result.stdout)
                self.outcome = TestOutcome.FAILED


def report_results_to_github(tests: list[dict[str:TestOutcome]], url: str):
    #
    #
    pass


@shared_task
def do_ci_e2e_test_run(
    tests: list,
    report_results: bool = False,
):
    logger.info("Running tests %s", tests)
    test_results = {}
    for _test in tests:
        test = E2ETest(_test)
        test.run()
        test_results[_test] = test.outcome.value
    if report_results:
        report_results_to_github(test_results, settings.GITHUB_ACTIONS_API_URL)
