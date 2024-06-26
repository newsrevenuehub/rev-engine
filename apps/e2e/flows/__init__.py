from dataclasses import dataclass
import importlib


def register_flow(fn: callable) -> callable:
    """Decorator to register a function in flow file as a flow.

    All such flows will be collected from the file and run in the end-to-end flow runner.
    """
    fn._e2e_flow = True
    return fn


@dataclass
class FlowRunner:

    def from_flow_module(module_path: str):
        """Run a flow."""
        module = importlib.import_module(module_path)
