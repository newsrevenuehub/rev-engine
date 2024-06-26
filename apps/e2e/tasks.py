from dataclasses import dataclass
from enum import Enum
from django.conf import settings

from celery import shared_task
from celery.utils.log import get_task_logger

import pytest
from pytest_jsonreport.plugin import JSONReport
import requests

from apps.e2e import FLOWS
from apps.e2e.choices import TestOutcome

logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


@dataclass()
class E2ETest:
    name: str
    outcome: TestOutcome = None
    description: str = None

    def __post_init__(self):
        if self.name not in TESTS:
            raise ValueError(f"Test {self.name} not found in available tests")

    def run(self) -> None:
        logger.info("Running test %s", self.name)
        json_report = JSONReport()
        # Setting --json-report-file=none to avoid writing to file so we'll be able to
        # access the report object directly
        pytest.main(["--json-report-file=none", TESTS[self.name]], plugins=[json_report])
        for x in [x for x in json_report.report["tests"] if x["outcome"] == "failed"]:
            x["call"]["crash"]
        if (report := json_report.report)["summary"]["failed"]:
            failed = [x for x in report["tests"] if x["outcome"] == "failed"]
            report["tests"][0]["call"]["crash"]
            logger.warn("Test %s failed", self.name)
            self.outcome = TestOutcome.FAILED
            self.message = report["tests"]
        #                 {'lineno': 162,
        #  'message': 'Failed: Contributor not found in DB',
        #  'path': '/Users/benwhite/Projects/rev-engine/apps/e2e/flows/test_contribution_checkout.py'}
        else:
            logger.info("Test %s succeeded", self.name)
            self.outcome = TestOutcome.PASSED


_GH_HEADERS = {
    "Accept": "application/vnd.github+json",
    "Authorization": f"token {settings.GITHUB_TOKEN}",
}

_GH_COMMIT_CONTEXT = "ci/e2e"
_GH_REPO_URL = "https://api.github.com/repos/newsrevenuehub/rev-engine/"


def create_commit_comment(commit_sha: str, body: str):
    logger.info("Commit sha: %s, body: %s", commit_sha, body)
    response = requests.post(
        f"{_GH_REPO_URL}commits/{commit_sha}/comments",
        headers=_GH_HEADERS,
        json={"body": body},
    )
    response.raise_for_status()


def create_commit_status(commit_sha: str, results: list[E2ETest], overall_outcome: TestOutcome):
    logger.info("Commit sha: %s, state: %s", commit_sha, overall_outcome.value)
    response = requests.post(
        f"{_GH_REPO_URL}statuses/{commit_sha}",
        headers=_GH_HEADERS,
        json={
            "state": overall_outcome.value,
            # iterate over results to generate description
            "description": None,
            "context": _GH_COMMIT_CONTEXT,
        },
    )
    response.raise_for_status()


def report_results_to_github(results: list[E2ETest], commit_sha: str, outcome: TestOutcome):
    overall_outcome = (
        TestOutcome.SUCCESS if all(val == TestOutcome.PASSED for val in results.values()) else TestOutcome.FAILURE
    )
    create_commit_status(commit_sha, results, overall_outcome)
    if overall_outcome == TestOutcome.FAILURE:
        # generate description from failed tests
        create_commit_comment(commit_sha, body="")


@shared_task
def do_ci_e2e_flow_run(
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
        # this should take a list of tests not a single result
        report_results_to_github(results=test_results, commit_sha=commit_sha)
    return test_results
