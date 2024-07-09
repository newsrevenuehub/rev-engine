from django.conf import settings

from celery import shared_task
from celery.exceptions import Ignore
from celery.utils.log import get_task_logger
from github.CommitStatus import CommitStatus as GhCommitStatus

from apps.common.github import get_github_client
from apps.e2e.models import CommitStatus
from apps.e2e.utils import E2eTestRunner


logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


def _report_results(status: CommitStatus) -> GhCommitStatus:
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
    """Run a named e2e flow and optionally reports results back to GitHub.

    Results in creation of a revengine CommitStatus model instance
    """
    logger.info("Running E2E flow %s for commit %s", name, commit_sha)
    if report_results and not commit_sha:
        logger.error(msg := "commit_sha is required when report_results is True")
        raise Ignore(msg)
    logger.info("Getting E2E runner for flow %s", name)
    runner = E2eTestRunner(name=name, commit_sha=commit_sha)
    commit_status = runner.run()
    if report_results:
        gh_status = _report_results(commit_status)
        commit_status.github_id = gh_status.id
        commit_status.save()
    logger.info("E2E test %s for commit %s created commit status %s on GH", name, commit_sha, gh_status.id)
