from functools import partial
from pathlib import Path

from django.contrib import admin
from django.db.models import Q

from reversion.admin import VersionAdmin
from sorl.thumbnail.admin import AdminImageMixin

from apps.common.admin import RevEngineBaseAdmin
from apps.common.models import SocialMeta
from apps.organizations.forms import FeatureForm
from apps.organizations.models import (
    Benefit,
    BenefitLevel,
    Feature,
    Organization,
    PaymentProvider,
    Plan,
    RevenueProgram,
)


class SocialMetaInline(admin.StackedInline):
    model = SocialMeta


class NoRelatedInlineAddEditAdminMixin:  # pragma: no cover
    related_fieldname = None

    def get_formset(self, request, obj=None, **kwargs):
        """
        Override get_formset to adjust the properties of the related field
        such that users are unable to create or edit them inline (only add existing).
        """
        formset = super().get_formset(request, obj, **kwargs)

        if self.related_fieldname:
            form = formset.form
            form.base_fields[self.related_fieldname].widget.can_add_related = False
            form.base_fields[self.related_fieldname].widget.can_change_related = False
        return formset


class ReadOnlyOrgLimitedTabularInlineMixin(admin.TabularInline):  # pragma: no cover
    related_fieldname = None
    org_limited_fieldname = None

    def formfield_for_foreignkey(self, db_field, request=None, **kwargs):
        """
        Here we limit the choices of "benefit_level" inlines to those related by org.
        """
        formfield = super().formfield_for_foreignkey(db_field, request, **kwargs)
        if self.related_fieldname:
            try:
                parent_id = int(Path(request.path).parts[-2])
            except ValueError:
                parent_id = None
            if db_field.name == self.related_fieldname and parent_id:
                parent_instance = self.parent_model.objects.filter(pk=parent_id).first()
                formfield.limit_choices_to = Q(revenue_program=parent_instance.revenue_program)
        return formfield


class RevenueProgramBenefitLevelInline(NoRelatedInlineAddEditAdminMixin, ReadOnlyOrgLimitedTabularInlineMixin):
    model = BenefitLevel
    verbose_name = "Benefit level"
    verbose_name_plural = "Benefit levels"
    extra = 0


class BenefitLevelBenefit(NoRelatedInlineAddEditAdminMixin, ReadOnlyOrgLimitedTabularInlineMixin):
    model = BenefitLevel.benefits.through
    verbose_name = "Benefit"
    verbose_name_plural = "Benefits"
    extra = 0

    related_fieldname = "benefit"


@admin.register(Organization)
class OrganizationAdmin(RevEngineBaseAdmin, VersionAdmin):  # pragma: no cover
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
            {"fields": ("plan",)},
        ),
        (
            "Email Templates",
            {"fields": ("send_receipt_email_via_nre",)},
        ),
    )

    fieldsets = organization_fieldset

    list_display = [
        "name",
        "plan",
    ]

    list_filter = [
        "name",
        "plan",
    ]

    inline_type = "stacked"

    readonly_fields = ["name"]

    def get_readonly_fields(self, request, obj=None):
        if Path(request.path).parts[-1] == "add":
            return []
        return ["name"]


@admin.register(Benefit)
class BenefitAdmin(RevEngineBaseAdmin, VersionAdmin):
    list_display = ["name", "description", "revenue_program"]

    list_filter = ["revenue_program"]

    fieldsets = ((None, {"fields": ("name", "description", "revenue_program")}),)


@admin.register(BenefitLevel)
class BenefitLevelAdmin(RevEngineBaseAdmin, VersionAdmin):
    list_display = ["name", "donation_range", "revenue_program"]

    list_filter = ["revenue_program"]

    fieldsets = (
        (
            None,
            {
                "fields": ("name", "currency", "lower_limit", "upper_limit", "level", "revenue_program"),
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
            return self.readonly_fields + ["revenue_program"]
        return self.readonly_fields


@admin.register(RevenueProgram)
class RevenueProgramAdmin(RevEngineBaseAdmin, VersionAdmin, AdminImageMixin):  # pragma: no cover
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
                    "non_profit",
                    "country",
                )
            },
        ),
        (
            "Stripe",
            {
                "fields": ("stripe_statement_descriptor_suffix", "domain_apple_verified_date", "payment_provider"),
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

    list_display = [
        "name",
        "organization",
        "slug",
        "country",
    ]

    list_filter = [
        "name",
        "country",
    ]

    inline_type = "stacked"

    inlines = [RevenueProgramBenefitLevelInline, SocialMetaInline]

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
        form = super().get_form(request, obj, **kwargs)

        if default_dp_field := form.base_fields.get("default_donation_page", None):
            default_dp_field.widget.can_add_related = False
            default_dp_field.widget.can_change_related = False
            default_dp_field.widget.can_delete_related = False

        return form

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
class PlanAdmin(RevEngineBaseAdmin, VersionAdmin):  # pragma: no cover
    fieldsets = (("Plan", {"fields": ("name", "features")}),)

    list_display = ["name"]

    list_filter = ["name"]


@admin.register(Feature)
class FeatureAdmin(RevEngineBaseAdmin, VersionAdmin):  # pragma: no cover
    form = FeatureForm
    fieldsets = (("Feature", {"fields": ("name", "feature_type", "feature_value", "description")}),)

    list_display = ["name", "feature_type", "feature_value"]

    list_filter = ["name", "feature_type"]


@admin.register(PaymentProvider)
class PaymentProviderAdmin(RevEngineBaseAdmin):  # pragma: no cover
    search_fields = ("stripe_account_id",)
    list_display = [
        "stripe_account_id",
        "stripe_product_id",
        "currency",
        "default_payment_provider",
        "stripe_oauth_refresh_token",
        "stripe_verified",
    ]
    list_per_page = 20
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "stripe_account_id",
                    "stripe_product_id",
                    "currency",
                    "default_payment_provider",
                    "stripe_oauth_refresh_token",
                    "stripe_verified",
                ),
            },
        ),
    )
