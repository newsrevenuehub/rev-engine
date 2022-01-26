import json

from django import template
from django.apps import apps
from django.conf import settings
from django.urls import reverse


register = template.Library()


@register.inclusion_tag("spa_env.html")
def insert_spa_env():
    spa_env = json.dumps(settings.SPA_ENV_VARS)
    return {"spa_env_json": spa_env}


@register.inclusion_tag("admin_limited_select.html")
def admin_limited_select(parent_model, child_model, parent_selector, child_selector, accessor_method):
    parent_model_class = apps.get_model(parent_model)
    child_model_class = apps.get_model(child_model)

    # Validate that the accessor_method exists on parent_model here to
    # catch misconfigurations early in implementation.
    assert hasattr(
        parent_model_class, accessor_method
    ), f"Parent model {parent_model} missing expected property {accessor_method}"

    return {
        "admin_select_url": reverse("admin-select-options"),
        "parent_model_name": parent_model_class.__name__,
        "child_model_name": child_model_class.__name__,
        "parent_model": parent_model,
        "parent_selector": parent_selector,
        "child_selector": child_selector,
        "accessor_method": accessor_method,
    }
