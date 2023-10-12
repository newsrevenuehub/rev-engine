from django.core.exceptions import ValidationError


required_style_keys = {"radii": list, "font": dict, "fontSizes": list}


def style_validator(style):
    errors = []
    for key, valType in required_style_keys.items():
        if key not in style or not isinstance(style[key], valType):
            errors.append(ValidationError(f'Style objects must contain a "{key}" key of type "{valType}"'))
    if errors:
        raise ValidationError(errors)
