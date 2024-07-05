from django.conf import settings

from celery.exceptions import Ignore

from celery import shared_task
from celery.utils.log import get_task_logger

from apps.common.github import get_github_client

from apps.e2e import FLOWS, get_e2e_runner
from apps.e2e.models import CommitStatus


logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


def _report_results(status: CommitStatus) -> CommitStatus:
    """Report the results of the E2E test run."""
    logger.info("Reporting results for commit %s to GitHub", status.commit_sha)
    client = get_github_client()
    repo = client.get_repo(settings.GITHUB_REPO)
    return repo.get_commit(status.commit_sha).create_status(
        state=status.state.value,
        description=status.description,
        target_url=status.target_url,
        context=status.context,
    )


@shared_task
def do_ci_e2e_flow_run(
    name: str,
    commit_sha: str = None,
    report_results: bool = False,
) -> None:
    """Runs a named e2e flow and optionally reports results back to GitHub.

    Results in creation of a revengine CommitStatus model instance
    """
    logger.info("Running E2E flow %s for commit %s", name, commit_sha)
    if report_results and not commit_sha:
        logger.error((msg := "commit_sha is required when report_results is True"))
        raise Ignore(msg)
    if name not in FLOWS:
        logger.error((msg := f"Flow `{name}` not supported"))
        raise Ignore(msg)
    logger.info("Getting E2E runner for flow %s", name)
    runner = get_e2e_runner(test_file_path=FLOWS[name])
    # this has to be written next
    outcome = runner.run()
    status = CommitStatus(
        name=name,
        commit_sha=commit_sha,
        details=outcome.details,
        screenshot=outcome.screenshot,
    )
    if report_results:
        gh_status = _report_results(status)
        status.github_id = gh_status.id
    status.save()
    logger.info("E2E flow %s for commit %s created commit status %s", name, commit_sha, status.id)
