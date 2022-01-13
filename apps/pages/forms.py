from django import forms


class TranslatedPageAdminChangeForm(forms.ModelForm):
    language = forms.ChoiceField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["language"].choices = self._get_language_choices()

    def _get_language_choices(self):
        return [(l, l) for l in self.instance.page.available_translations]
