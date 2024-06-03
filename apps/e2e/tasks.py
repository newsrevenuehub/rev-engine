from dataclasses import dataclass
from enum import Enum

from django.conf import settings

from celery import Task, shared_task
from celery.utils.log import get_task_logger
import requests
import subprocess

from e2e import TESTS

from sentry_sdk import configure_scope


logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class TestOutcome(Enum):
    PASSED = "passed"
    FAILED = "failed"


@dataclass()
class E2ETest:

    name: str
    outcome: TestOutcome = None

    def __post_init__(self):
        if self.name not in TESTS:
            raise ValueError(f"Test {self.name} not found in available tests")

    def run(self):
        try:
            result = subprocess.run(["pytest", TESTS[self.name]], capture_output=True, text=True)
        except Exception as e:
            logger.error(f"Test {self.name} failed with uncaught error: {e}")
            self.outcome = TestOutcome.FAILED
        else:
            if result.returncode == 0:
                logger.info(f"Test {self.name} passed")
                self.outcome = TestOutcome.PASSED
            else:
                logger.warning(f"Test {self.name} failed with output: {result.stdout}")
                self.outcome = TestOutcome.FAILED


def report_results_to_github(tests: list[dict[str:TestOutcome]], url: str):
    # this is just a placeholder for now
    pass


@shared_task
def do_ci_e2e_test_run(
    tests: list,
):
    logger.info(f"Running tests {tests}")
    test_results = {}
    for test in tests:
        test_instance = E2ETest(test)
        test_instance.run()
        test_results[test] = test_instance.outcome.value
    report_results_to_github(test_results, settings.GITHUB_ACTIONS_API_URL)
