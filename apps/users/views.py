from django.contrib.auth.views import PasswordResetConfirmView
from django.urls import reverse_lazy


class UserTypeSensitivePasswordResetConfirm(PasswordResetConfirmView):
    def form_valid(self, form):
        if self.user.organizations.exists():
            self.success_url = reverse_lazy("orgadmin_password_reset_complete")
        return super().form_valid(form)
