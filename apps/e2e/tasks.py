import shutil
import subprocess
from dataclasses import dataclass
from enum import Enum

from django.conf import settings

from celery import shared_task
from celery.utils.log import get_task_logger

from apps.e2e import TESTS


logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


class TestOutcome(Enum):
    PASSED = "passed"
    FAILED = "failed"


ALLOWED_COMMANDS = ("pytest",)


def start_e2e_subprocess(test_path: str):
    """Run a subprocess command and return the result.

    We make a minimal effort to ensure that the command is an expected one, that it can be
    fully qualified in execution space.
    """
    logger.info("Running test %s", test_path)
    if test_path not in TESTS.values():
        raise ValueError("Arguments not found in available tests")
    pytest = shutil.which("pytest")
    if not pytest:
        raise ValueError("Command `pytest` not found")
    safe_args = [pytest, test_path]
    proc = subprocess.run(safe_args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)  # noqa S603
    returncode = proc.returncode
    return subprocess.CompletedProcess(
        args=safe_args, returncode=returncode, stdout=subprocess.PIPE, stderr=subprocess.PIPE  # UP002
    )


@dataclass()
class E2ETest:
    name: str
    outcome: TestOutcome = None

    def __post_init__(self):
        if self.name not in TESTS:
            raise ValueError(f"Test {self.name} not found in available tests")

    def run(self) -> None:
        logger.info("Running test %s", self.name)
        try:
            result = start_e2e_subprocess(TESTS[self.name])
        except Exception:
            logger.exception("Test %s failed with uncaught error", self.name)
            self.outcome = TestOutcome.FAILED
        else:
            if result.returncode == 0:
                logger.info("Test %s passed", self.name)
                self.outcome = TestOutcome.PASSED
            else:
                logger.warning("Test %s failed with output: %s", self.name, result.stdout)
                self.outcome = TestOutcome.FAILED


def report_results_to_github(commit_sha: str, result: str):
    logger.info("Commit sha: %s, result: %s", commit_sha, result)


@shared_task
def do_ci_e2e_test_run(
    tests: list,
    commit_sha: str = None,
    report_results: bool = False,
) -> dict[str, TestOutcome]:
    if report_results and not commit_sha:
        raise ValueError("commit_sha is required when report_results is True")
    logger.info("Running tests %s", list(tests))
    test_results = {}
    for _test in tests:
        test = E2ETest(_test)
        test.run()
        test_results[_test] = test.outcome.value
    result = "success" if all(val == TestOutcome.PASSED for val in test_results.values()) else "failure"
    if report_results:
        report_results_to_github(result=result, commit_sha=commit_sha)
    return test_results
