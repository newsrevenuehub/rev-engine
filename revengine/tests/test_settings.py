import importlib

import pytest


@pytest.mark.parametrize("config", ["base", "deploy", "dev", "local_example"])
def test_settings_import(config):
    """Will catch very little; typos. But is low effort."""
    importlib.import_module(f"revengine.settings.{config}")


def test_deploy_templates():
    deploy = importlib.import_module("revengine.settings.deploy")

    # test for TEMPLATES[0]["DIRS"]
    assert len(deploy.TEMPLATES) > 0
    assert "DIRS" in deploy.TEMPLATES[0]

    # keys used by for backend in deploy.TEMPLATES:
    for template in deploy.TEMPLATES:
        assert "BACKEND" in template
        assert "OPTIONS" in template
