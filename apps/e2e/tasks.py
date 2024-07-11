from django.conf import settings
from django.urls import reverse

from celery import shared_task
from celery.utils.log import get_task_logger
from github import CommitStatus as GhCommitStatus

from apps.common.github import get_github_client
from apps.e2e.models import CommitStatus
from apps.e2e.utils import E2eTestRunner


logger = get_task_logger(f"{settings.DEFAULT_LOGGER}.{__name__}")


def _report_results(status: CommitStatus) -> GhCommitStatus:
    """Report the results of the E2E test run."""
    logger.info("Reporting results for commit %s to GitHub", status.commit_sha)
    client = get_github_client()
    repo = client.get_repo(settings.GITHUB_REPO)
    target_url = f"{settings.SITE_URL}{reverse('e2e-detail', args=[status.commit_sha, status.id])}"
    return repo.get_commit(status.commit_sha).create_status(
        state=status.state.value,
        description=status.details,
        target_url=target_url,
        context=status.context,
    )


@shared_task(max_retries=3, bind=True, default_retry_delay=10)
def do_ci_e2e_flow_run(
    self,
    name: str,
    commit_sha: str,
    report_results: bool = False,
) -> None:
    """Run a named e2e flow and optionally reports results back to GitHub.

    Results in creation of a revengine CommitStatus model instance
    """
    logger.info("Running E2E flow %s for commit %s", name, commit_sha)
    logger.info("Getting E2E runner for flow %s", name)
    runner = E2eTestRunner(name=name, commit_sha=commit_sha)
    commit_status = runner.run()
    if report_results:
        gh_status = _report_results(commit_status)
        commit_status.github_id = gh_status.id
        commit_status.save()
    logger.info("E2E test %s for commit %s created commit status %s on GH", name, commit_sha, commit_status.id)
