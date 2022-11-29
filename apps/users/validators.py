from rest_framework import serializers


def tax_id_validator(value):
    if not isinstance(value, str):
        raise serializers.ValidationError("Value must be a string")
    if len(value) != 9:
        raise serializers.ValidationError("EIN must have 9 digits")
    try:
        int(value)
    except ValueError:
        raise serializers.ValidationError("EIN must contain only numbers")
