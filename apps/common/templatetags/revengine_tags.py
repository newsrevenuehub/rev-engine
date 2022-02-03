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
    """
    When a user in DjangoAdmin makes a change to a dropdown for `parent_model`, as identified in the DOM by
    the `parent_selector`, a request is made to get the values using `accessor_method` that should then populate the dropdown
    for `child_model`, as identified by `child_selector`.

    `parent_selector` and `child_selector` are used in javascript like so:

    $('select[name="{{parent_selector}}"]')
    $('select[name*="{{child_selector}}"]')

    Note the "name*" wildcard in the child_selector selector. This is necessary due to the way Django names
    selects that contain models added to the admin via Inlines.

    Added to a DjangoAdmin changeform template `admin_change_form_document_ready` block,
    this inclusion tag will add two scripts to the Document. The second script contains
    the javascript necessary to perfrom the actions described above. The first is a JSON
    mapping of the dict returned by this tag.
    """
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
