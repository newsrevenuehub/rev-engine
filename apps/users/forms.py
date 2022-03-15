from django import forms
from django.core.exceptions import ValidationError
from django.db.models import Q

from apps.users.models import RoleAssignment, Roles


class RoleAssignmentAdminForm(forms.ModelForm):
    no_org_message = "This role may not be assigned an Organization"
    no_rp_message = "This role may not be assigned RevenuePrograms"
    missing_org_message = "This role must be assigned an Organization"
    missing_rp_message = "This role must be assigned at least one RevenueProgram"

    def clean(self):
        """
        Here we ensure that:
        - Hub Admins do NOT have Orgs or RevenuePrograms defined
        - Org Admins DO have an Org defined, but do NOT have RevenuePrograms defined
        - RP Admins DO have both Orgs and RevenuePrograms defined
        """
        error_dict = {}

        if self.cleaned_data["role_type"] == Roles.HUB_ADMIN:
            if self.cleaned_data["organization"]:
                error_dict["organization"] = self.no_org_message
            if self.cleaned_data["revenue_programs"]:
                error_dict["revenue_programs"] = self.no_rp_message

        if self.cleaned_data["role_type"] == Roles.ORG_ADMIN:
            if not self.cleaned_data["organization"]:
                error_dict["organization"] = self.missing_org_message
            if self.cleaned_data["revenue_programs"]:
                error_dict["revenue_programs"] = self.no_rp_message

        if self.cleaned_data["role_type"] == Roles.RP_ADMIN:
            if not self.cleaned_data["organization"]:
                error_dict["organization"] = self.missing_org_message
            if not self.cleaned_data["revenue_programs"]:
                error_dict["revenue_programs"] = self.missing_rp_message

            # Filter for any revenue programs that do not belong to this Org
            mismatched_rps = self.cleaned_data["revenue_programs"].filter(
                ~Q(organization=self.cleaned_data["organization"])
            )

            if mismatched_rps.exists():
                error_dict[
                    "revenue_programs"
                ] = f"The following RevenuePrograms do not belong to your chosen Org: {', '.join([rp.name for rp in mismatched_rps])}"

        if error_dict:
            raise ValidationError(error_dict)

    class Meta:
        model = RoleAssignment
        fields = "__all__"

    # class Media:
    #     css = {
    #         "all": ("/static/admin/css/widgets.css",),
    #     }
    #     js = ("/admin/jsi18n",)
