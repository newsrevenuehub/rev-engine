from apps.contributions.utils import (
    SWAG_CHOICE_KEY_PREFIX,
    _get_option_name_from_swag_key,
    _get_swag_choices,
    parse_pi_data_for_swag_options,
)


def test_get_option_name_from_swag_key():
    target_name = "my-test-option"
    swag_key = f"{SWAG_CHOICE_KEY_PREFIX}_{target_name}"
    option_name = _get_option_name_from_swag_key(swag_key)
    assert target_name == option_name


def test_get_swag_choices():
    target_name = "my-test-option"
    target_option = "my option"
    choice_key = f"{SWAG_CHOICE_KEY_PREFIX}_{target_name}"
    test_data = {choice_key: target_option}
    choices = _get_swag_choices(test_data)
    assert len(choices) == 1
    assert choices[0] == (target_name, target_option)


def test_parse_pi_data_for_swag_options():
    target_name = "my-test-option"
    target_option = "my option"
    choice_key = f"{SWAG_CHOICE_KEY_PREFIX}_{target_name}"
    test_data = {choice_key: target_option}

    parse_pi_data_for_swag_options(test_data)

    # For now, ensure that the swag options selected always appear under the "t_shirt_size" key
    assert "t_shirt_size" in test_data
    assert test_data["t_shirt_size"] == f"{target_name} -- {target_option}"
    # Also, swag_opt_out should default to false, if not provided
    assert "swag_opt_out" in test_data
    assert test_data["swag_opt_out"] == False

    # Ensure that providing swag_opt_out: True passes it through
    test_data["swag_opt_out"] = True
    parse_pi_data_for_swag_options(test_data)
    assert test_data["swag_opt_out"] == True


def test_parse_pi_data_for_swag_options_comp_subscription():
    test_data = {"comp_subscription": True}
    parse_pi_data_for_swag_options(test_data)

    # comp_subscription: True converts to "nyt" (for now...)
    assert test_data["comp_subscription"] == "nyt"

    # If comp_subscription is False, return nothing
    del test_data["comp_subscription"]
    parse_pi_data_for_swag_options(test_data)
    assert "comp_subscription" not in test_data
