import logging

from django.conf import settings

import stripe

from apps.contributions.utils import get_hub_stripe_api_key
from apps.organizations.models import RevenueProgram


stripe.api_key = get_hub_stripe_api_key()

logging.getLogger("stripe").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)
rps = RevenueProgram.objects.all()


def run():
    for rp in rps:
        if not rp.payment_provider:
            continue
        acct = rp.payment_provider.stripe_account_id
        if not acct:
            continue

        try:
            domains = stripe.ApplePayDomain.list(stripe_account=acct, limit=100)
        except stripe.error.PermissionError:
            logger.info("error listing domain for %s", rp)
            continue

        names = [x.domain_name for x in domains.data]
        expected_domain = f"{rp.slug}.{settings.DOMAIN_APEX}"
        if expected_domain not in names:
            logger.info("apple pay domain missing for %s", rp.slug)
