from django.urls import reverse_lazy
from django.views.decorators.cache import never_cache
from django.views.generic import TemplateView
from django.contrib.auth.views import PasswordResetConfirmView

# Serve Single Page Application
index = never_cache(TemplateView.as_view(template_name="index.html"))


class UserTypeSensitivePasswordResetConfirm(PasswordResetConfirmView):
    def form_valid(self, form):
        if self.user.organizations.exists():
            self.success_url = reverse_lazy("orgadmin_password_reset_complete")
        return super().form_valid(form)
