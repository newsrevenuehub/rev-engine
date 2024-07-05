from dataclasses import dataclass

from apps.e2e.choices import CommitStatusState

FLOWS = {
    "contribution_checkout": "apps/e2e/flows/contribution_checkout.py",
}


@dataclass(frozen=True)
class E2eOutcome:
    """ """

    state: CommitStatusState
    decription: str
    screenshot_path: str


def get_e2e_runner(test_file_path: str):
    """Return the E2E runner."""
    from importlib import import_module

    module = import_module(test_file_path)
    return module.E2ERunner()
