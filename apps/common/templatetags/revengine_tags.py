import json

from django import template
from django.conf import settings


register = template.Library()


@register.inclusion_tag("spa_env.html")
def insert_spa_env():
    spa_env = json.dumps(settings.SPA_ENV_VARS)
    return {"spa_env_json": spa_env}
