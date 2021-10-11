from django.conf import settings


SWAG_CHOICE_KEY_PREFIX = "swag_choice"


def get_hub_stripe_api_key(livemode=False):
    """
    Caller can force livemode with argument, otherwise use setting.
    """
    if livemode or settings.STRIPE_LIVE_MODE == "True":
        return settings.STRIPE_LIVE_SECRET_KEY
    return settings.STRIPE_TEST_SECRET_KEY


def _get_option_name_from_swag_key(key):
    return key.split(f"{SWAG_CHOICE_KEY_PREFIX}_")[1]


def _get_swag_choices(pi_data):
    return [
        (_get_option_name_from_swag_key(key), pi_data[key]) for key in pi_data if SWAG_CHOICE_KEY_PREFIX in key.lower()
    ]


def parse_pi_data_for_swag_options(pi_data):
    swag_choices = _get_swag_choices(pi_data)
    # swag_opt_out defaults to false.
    pi_data["swag_opt_out"] = pi_data.get("swag_opt_out", False)
    if swag_choices:
        # For now, we only accept one and we force it in to "t_shirt_size"
        pi_data["t_shirt_size"] = f"{swag_choices[0][0]} -- {swag_choices[0][1]}"
