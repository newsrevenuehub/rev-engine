from django.apps import AppConfig
from django.conf import settings

import stripe

from apps.contributions.utils import get_hub_stripe_api_key


class ContributionsConfig(AppConfig):
    name = "apps.contributions"

    def ready(self):
        stripe.api_key = get_hub_stripe_api_key()
        stripe.api_version = settings.STRIPE_API_VERSION
