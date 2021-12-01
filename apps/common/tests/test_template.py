import json

from django.conf import settings
from django.test import TestCase

from apps.common.templatetags.revengine_tags import insert_spa_env


class RevengineTagsTest(TestCase):
    def test_tag_returns_expected_json(self):
        expected_json = json.dumps(settings.SPA_ENV_VARS)
        template_dict = insert_spa_env()
        resulting_json = template_dict["spa_env_json"]

        self.assertEqual(expected_json, resulting_json)
