from django import forms

from apps.media.models import MediaImage


class MediaImageForm(forms.ModelForm):
    class Meta:
        model = MediaImage
