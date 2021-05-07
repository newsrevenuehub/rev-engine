from django.conf import settings


def get_hub_stripe_api_key(livemode=None):
    """
    Caller can force livemode with argument, otherwise use setting.
    """
    if livemode is True or settings.STRIPE_LIVE_MODE is True:
        return settings.STRIPE_LIVE_SECRET_KEY
    return settings.STRIPE_TEST_SECRET_KEY
