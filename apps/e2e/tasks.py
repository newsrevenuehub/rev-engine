import shlex
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


def subprocess_call(command, args):
    """Run a subprocess command and return the result."""
    if command not in ALLOWED_COMMANDS:
        raise ValueError(f"Command {command} not allowed")
    if not set(args).issubset(TESTS.keys()):
        raise ValueError(f"Arguments {args} not found in available tests")
    full_command = shutil.which(command)
    if not full_command:
        raise ValueError(f"Command {command} not found")
    safe_args = [full_command, *(shlex.quote(arg) for arg in args)]
    # despite sanitizing the command and args, Ruff is still not happy
    # seemingly because of this conflict between s602 and s603
    # https://github.com/astral-sh/ruff/issues/4045
    return subprocess.run(safe_args, check=True)  # noqa: S603


@dataclass(frozen=True)
class E2ETest:

    name: str
    outcome: TestOutcome = None

    def __post_init__(self):
        if self.name not in TESTS:
            raise ValueError(f"Test {self.name} not found in available tests")

    def run(self) -> None:
        try:
            result = subprocess_call(TESTS[self.name]["command"], TESTS[self.name]["args"])
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


def report_results_to_github(commit_sha: str, result: str):
    logger.info("Commit sha: %s, result: %s", commit_sha, result)


@shared_task
def do_ci_e2e_test_run(
    tests: list,
    commit_sha: str,
    report_results: bool = False,
) -> dict[str, TestOutcome]:
    if report_results and not commit_sha:
        raise ValueError("commit_sha is required when report_results is True")
    logger.info("Running tests %s", tests)
    test_results = {}
    for _test in tests:
        test = E2ETest(_test)
        test.run()
        test_results[_test] = test.outcome.value
    result = "success" if all(test.outcome == TestOutcome.PASSED for test in test_results.values()) else "failure"
    if report_results:
        report_results_to_github(result=result, commit_sha=commit_sha)
    return test_results
