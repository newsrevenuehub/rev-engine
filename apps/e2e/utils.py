import importlib
import inspect
import logging
from dataclasses import InitVar, dataclass
from pathlib import Path

from django.core.files.base import ContentFile
from django.utils import timezone

from apps.e2e.choices import CommitStatusState
from apps.e2e.models import CommitStatus


logger = logging.getLogger(__name__)


def load_module(module_name: str, module_path: str):
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@dataclass
class E2eOutcome:
    state: CommitStatusState
    details: str
    screenshot: bytes = None


@dataclass
class E2eTestRunner:
    name: str
    commit_sha: str = None
    module_path: InitVar[str] = "apps/e2e/flows"
    function_name: InitVar[str] = "test_e2e"

    def run(self) -> CommitStatus:
        """Run the E2E test flow."""
        if not Path.exists(self.module_path):
            logger.warning("Module path not found at %s", self.module_path)
            return None
        module = load_module(self.name, f"{self.module_path}/{self.name}.py")
        test_fn = next(
            (func for name, func in inspect.getmembers(module, inspect.isfunction) if name == self.function_name),
            None,
        )
        if not test_fn:
            logger.warning("Function %s not found in module %s", self.function_name, self.name)
            return None
        try:
            outcome = test_fn()
        except Exception as exc:
            logger.exception("Unexpected error running flow %s", self.name)
            outcome = E2eOutcome(state=CommitStatusState.FAILURE, details=f"Unexpected error: {exc}", screenshot=None)
        return CommitStatus.objects.create(
            screenshot=(
                ContentFile(outcome.screenshot, name=f"{self.name}-{timezone.now().strftime('%Y%m%d%H%M%S')}.png")
                if outcome.screenshot
                else None
            ),
            commit_sha=self.commit_sha,
            name=self.name,
            state=outcome.state,
            details=outcome.details,
        )
