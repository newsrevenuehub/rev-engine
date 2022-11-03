from rest_framework import serializers


def tax_id_validator(value):

    # Note - this will have uncaught typeerror if a number is passed as value. Maybe that's not an issue
    # because it's used in CharField. That said, if this validator was used in a different field type,
    # the typerror could happen

    # maybe do this??
    if not isinstance(value, str):
        raise serializers.ValidationError("Value must be a string")

    if len(value) != 9:
        raise serializers.ValidationError("EIN must have 9 digits")
    try:
        int(value)
    except ValueError:
        raise serializers.ValidationError("EIN must contain only numbers")
