from dataclasses import dataclass, InitVar
import logging
from typing import TypedDict

import importlib

from apps.e2e.exceptions import E2EError
from apps.e2e.models import FlowRunResult, E2ECiCheck


logger = logging.getLogger(__name__)


def register_flow(fn: callable) -> callable:
    """Decorator to register a function in flow file as a flow.

    All such flows will be collected from the file and run in the end-to-end flow runner.
    """
    fn._e2e_flow = True
    return fn


class FlowRunResult(TypedDict):
    flow_name: str
    outcome: str
    message: str


@dataclass
class FlowRunner:
    results: dict[str, FlowRunResult] = {}
    name: str
    module_path: InitVar[str]
    commit_sha: str

    def __post_init__(self, module_path):
        self._flows = self.get_flows_from_module(module_path)

    def get_flows_from_module(module_path: str) -> list[tuple[callable, str]]:
        """Get flow functions registered with `@register_flow` decorator from a module."""
        module = importlib.import_module(module_path)
        return [((fn := getattr(module, _name)), _name) for _name in dir(module) if hasattr(fn, "_e2e_flow")]

    def run(self) -> E2ECiCheck:
        check = E2ECiCheck.objects.create(commit_sha=self.commit_sha, name="test", outcome="pending")
        if not self._flows:
            logger.warning("No flows found in module %s", self.module_path)
            check.outcome = "success"
        else:
            for flow, name in self._flows:
                _result = {"flow_name": name}
                try:
                    flow()
                    _result.update({"outcome": "success", "message": ""})
                except E2EError as exc:
                    _result.update({"outcome": "failure", "message": str(exc)})
                except Exception as exc:
                    logger.exception("Unexpected running flow %s", name)
                    _result.update({"outcome": "failure", "message": "Unexpected error"})
                self.results[name] = _result
            check.outcome = (
                "success" if all(result["outcome"] == "success" for result in self.results.values()) else "failure"
            )
        check.save()
        return check
