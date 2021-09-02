from django.core.exceptions import ValidationError


required_style_keys = {"radii": list, "font": str, "fontSizes": list}


def style_validator(value):
    errors = []
    for key, valType in required_style_keys.items():
        if key not in value or type(value[key]) != valType:
            errors.append(ValidationError(f'Style objects must contain a "{key}" key of type "{valType}"'))
    if errors:
        raise ValidationError(errors)
