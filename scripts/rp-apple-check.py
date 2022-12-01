import logging

from django.conf import settings

import stripe

from apps.contributions.utils import get_hub_stripe_api_key
from apps.organizations.models import RevenueProgram


stripe.api_key = get_hub_stripe_api_key()

logging.getLogger("stripe").setLevel(logging.WARNING)

rps = RevenueProgram.objects.all()


def run():
    for rp in rps:
        acct = rp.payment_provider.stripe_account_id
        if not acct:
            continue

        try:
            domains = stripe.ApplePayDomain.list(stripe_account=acct)
        except stripe.error.PermissionError:
            continue

        names = [x.domain_name for x in domains.data]
        expected_domain = f"{rp.slug}.{settings.DOMAIN_APEX}"
        if expected_domain not in names:
            print(f"apple pay domain missing for {rp.slug}")
