from functools import partial
from pathlib import Path

from django.contrib import admin
from django.db.models import Q

from django_reverse_admin import ReverseModelAdmin
from sorl.thumbnail.admin import AdminImageMixin

from apps.common.admin import RevEngineBaseAdmin
from apps.organizations.forms import FeatureForm
from apps.organizations.models import (
    Benefit,
    BenefitLevel,
    Feature,
    Organization,
    Plan,
    RevenueProgram,
)
from apps.users.admin import UserOrganizationInline


class RevenueProgramBenefitLevelInline(admin.TabularInline):
    model = RevenueProgram.benefit_levels.through
    verbose_name = "Benefit level"
    verbose_name_plural = "Benefit levels"
    extra = 0


class BenefitLevelBenefit(admin.TabularInline):
    model = BenefitLevel.benefits.through
    verbose_name = "Benefit"
    verbose_name_plural = "Benefits"
    extra = 0

    def get_formset(self, request, obj=None, **kwargs):
        """
        Override get_formset to adjust the properties of the related `benefit` field
        such that users are unable to create or edit Benefits inline. This is important
        because Benefits created or edited this way allow you to select an Organization.
        We cannot allow a Benefit for orgB to be set on a BenefitLevel for orgA.
        """
        formset = super().get_formset(request, obj, **kwargs)
        form = formset.form
        form.base_fields["benefit"].widget.can_add_related = False
        form.base_fields["benefit"].widget.can_change_related = False
        return formset


@admin.register(Organization)
class OrganizationAdmin(RevEngineBaseAdmin, ReverseModelAdmin):  # pragma: no cover
    organization_fieldset = (
        (
            "Organization",
            {
                "fields": (
                    "name",
                    "slug",
                )
            },
        ),
        (None, {"fields": ("salesforce_id",)}),
        (
            "Plan",
            {
                "fields": (
                    "non_profit",
                    "plan",
                )
            },
        ),
        (
            "Email Templates",
            {"fields": ("uses_email_templates",)},
        ),
        (
            "Payment Provider",
            {
                "fields": (
                    "currency",
                    "default_payment_provider",
                    "stripe_account_id",
                    "stripe_verified",
                    "stripe_product_id",
                    "domain_apple_verified_date",
                )
            },
        ),
    )

    fieldsets = organization_fieldset

    list_display = ["name", "slug", "plan"]

    list_filter = ["name", "plan", "address__state"]

    inline_type = "stacked"
    inline_reverse = [("address", {"fields": ["address1", "address2", "city", "state", "postal_code", "country"]})]
    inlines = [UserOrganizationInline]

    readonly_fields = ["name", "slug", "stripe_verified"]

    def get_readonly_fields(self, request, obj=None):
        if Path(request.path).parts[-1] == "add":
            return []
        return ["name", "slug"]


@admin.register(Benefit)
class BenefitAdmin(RevEngineBaseAdmin):
    list_display = ["name", "description", "organization"]

    list_filter = ["organization"]

    fieldsets = ((None, {"fields": ("name", "description", "organization")}),)


@admin.register(BenefitLevel)
class BenefitLevelAdmin(RevEngineBaseAdmin):
    list_display = ["name", "donation_range", "organization"]

    list_filter = ["organization"]

    fieldsets = (
        (
            None,
            {
                "fields": ("name", "currency", "lower_limit", "upper_limit", "organization"),
            },
        ),
    )

    # currency is readonly for now, since we don't support intl currencies
    readonly_fields = ["currency"]

    inlines = [BenefitLevelBenefit]

    # Overriding this template to add the `admin_limited_select` inclusion tag
    change_form_template = "organizations/benefitlevel_changeform.html"

    def get_readonly_fields(self, request, obj=None):
        """
        Organization becomes readonly after initial creation.
        """
        if obj:
            return self.readonly_fields + ["organization"]
        return self.readonly_fields


@admin.register(RevenueProgram)
class RevenueProgramAdmin(RevEngineBaseAdmin, ReverseModelAdmin, AdminImageMixin):  # pragma: no cover
    fieldsets = (
        (
            "RevenueProgram",
            {
                "fields": (
                    "name",
                    "slug",
                    "contact_email",
                    "organization",
                    "default_donation_page",
                )
            },
        ),
        (
            "Stripe",
            {
                "fields": ("stripe_statement_descriptor_suffix",),
            },
        ),
        (
            "Analytics",
            {
                "fields": (
                    "google_analytics_v3_domain",
                    "google_analytics_v3_id",
                    "google_analytics_v4_id",
                    "facebook_pixel_id",
                )
            },
        ),
        (
            "Social media",
            {
                "fields": (
                    "twitter_handle",
                    "website_url",
                ),
            },
        ),
        (
            "Other",
            {
                "fields": ("allow_offer_nyt_comp",),
            },
        ),
    )

    list_display = ["name", "slug"]

    list_filter = ["name"]

    inline_type = "stacked"
    inline_reverse = [
        ("social_meta", {"fields": ["title", "description", "url", "card"]}),
        ("address", {"fields": ["address1", "address2", "city", "state", "postal_code"]}),
    ]
    inlines = [RevenueProgramBenefitLevelInline]

    # Overriding this template to add the `admin_limited_select` inclusion tag
    change_form_template = "organizations/revenueprogram_changeform.html"

    def get_readonly_fields(self, request, obj=None):
        # If it's a changeform
        if obj:
            return ["name", "slug", "organization"]
        # If it's an addform
        # We can't allow setting default_donation_page until the RevenueProgram has been defined
        # because we need to limit the donation_page choices based on this instance.
        if not obj:
            return ["default_donation_page"]

    def get_form(self, request, obj=None, **kwargs):
        # This bit of trickery uses a pattern used by Django's modelform_factory. Django uses
        # the `formfield_callback` defined by its metaclass to turn model fields in to form fields.
        # Here, we set the callback to a partial derivation of the method is was going to use anyway,
        # self.formfield_for_dbfield, and pass in an extra argument, obj. In this way, we're passing
        # the model instance downstream to the formfield_for_dbfield method.
        kwargs["formfield_callback"] = partial(self.formfield_for_dbfield, request=request, obj=obj)
        return super().get_form(request, obj, **kwargs)

    def formfield_for_dbfield(self, db_field, **kwargs):
        # Here, use the `obj` arg added to the partial derivation of this method above to get the instance.
        revenue_program = kwargs.pop("obj", None)
        formfield = super().formfield_for_dbfield(db_field, **kwargs)

        # There might not be an instance (addform rather than changeform).
        if db_field.name == "default_donation_page" and revenue_program:
            # Then set the limit_choices_to property of the concerned field. This property can be a callable, a dict, or a Q object.
            # Here we limit the default_donation_page options using the subquery `revenue_program`="this instance"
            formfield.limit_choices_to = Q(revenue_program=revenue_program)
        return formfield


@admin.register(Plan)
class PlanAdmin(RevEngineBaseAdmin):  # pragma: no cover
    fieldsets = (("Plan", {"fields": ("name", "features")}),)

    list_display = ["name"]

    list_filter = ["name"]


@admin.register(Feature)
class FeatureAdmin(RevEngineBaseAdmin):  # pragma: no cover
    form = FeatureForm
    fieldsets = (("Feature", {"fields": ("name", "feature_type", "feature_value", "description")}),)

    list_display = ["name", "feature_type", "feature_value"]

    list_filter = ["name", "feature_type"]
