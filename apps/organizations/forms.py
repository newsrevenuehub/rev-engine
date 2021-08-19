from django import forms
from django.forms import ValidationError

from .models import Feature


def is_positive_integer(value):
    if not value.isnumeric():
        return False

    if int(value) < 1:
        return False

    return True


class FeatureForm(forms.ModelForm):
    class Meta:
        model = Feature
        fields = []

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("feature_type") == self.instance.FeatureType.PAGE_LIMIT and not is_positive_integer(
            cleaned.get("feature_value")
        ):
            raise ValidationError(
                "Page Limit types must be a positive integer value.",
                code="invalid",
            )
        if (
            cleaned.get("feature_type") == self.instance.FeatureType.BOOLEAN
            and cleaned.get("feature_value").lower() not in self.instance.VALID_BOOLEAN_INPUTS
        ):
            raise ValidationError(
                f"The feature type '{self.instance.FeatureType.BOOLEAN.label}' requires one of the following [1,0,t,f]",
                code="invalid",
            )
        return cleaned
