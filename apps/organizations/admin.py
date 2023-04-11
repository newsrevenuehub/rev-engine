from functools import partial
from pathlib import Path

from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.forms import ModelForm
from django.urls import reverse
from django.utils.safestring import mark_safe

from rest_framework.serializers import ValidationError as DRFValidationError
from reversion_compare.admin import CompareVersionAdmin
from sorl.thumbnail.admin import AdminImageMixin

from apps.common.admin import RevEngineBaseAdmin
from apps.common.models import SocialMeta
from apps.organizations.models import (
    Benefit,
    BenefitLevel,
    Organization,
    PaymentProvider,
    RevenueProgram,
)
from apps.users.validators import tax_id_validator


class SocialMetaInline(admin.StackedInline):
    model = SocialMeta


class NoRelatedInlineAddEditAdminMixin:
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


class ReadOnlyOrgLimitedTabularInlineMixin(admin.TabularInline):
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


class RevenueProgramAdminForm(ModelForm):
    def clean_tax_id(self):
        try:
            tax_id_validator(self.cleaned_data["tax_id"])
        except DRFValidationError as exc:
            raise ValidationError(exc.get_full_details()[0]["message"])
        return self.cleaned_data["tax_id"]


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
class OrganizationAdmin(RevEngineBaseAdmin, CompareVersionAdmin):
    organization_fieldset = (
        (
            "Organization",
            {
                "fields": (
                    "name",
                    "slug",
                    "plan_name",
                )
            },
        ),
        (None, {"fields": ("salesforce_id",)}),
        (
            "Email Templates",
            {"fields": ("send_receipt_email_via_nre",)},
        ),
        (
            "Integrations",
            {"fields": ("show_connected_to_slack", "show_connected_to_salesforce", "show_connected_to_mailchimp")},
        ),
    )

    fieldsets = organization_fieldset

    list_display = [
        "name",
        "plan_name",
    ]

    list_filter = [
        "name",
    ]

    inline_type = "stacked"

    readonly_fields = ["name"]

    def get_readonly_fields(self, request, obj=None):
        if Path(request.path).parts[-1] == "add":
            return []
        return ["name"]


@admin.register(Benefit)
class BenefitAdmin(RevEngineBaseAdmin, CompareVersionAdmin):
    list_display = ["name", "description", "revenue_program"]

    list_filter = ["revenue_program"]

    fieldsets = ((None, {"fields": ("name", "description", "revenue_program")}),)


@admin.register(BenefitLevel)
class BenefitLevelAdmin(RevEngineBaseAdmin, CompareVersionAdmin):
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
class RevenueProgramAdmin(RevEngineBaseAdmin, CompareVersionAdmin, AdminImageMixin):
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
                    "tax_id",
                    "country",
                    "fiscal_status",
                    "fiscal_sponsor_name",
                )
            },
        ),
        (
            "Stripe",
            {
                "fields": ("stripe_statement_descriptor_suffix", "domain_apple_verified_date", "payment_provider"),
            },
        ),
        ("Mailchimp", {"fields": ("mailchimp_server_prefix",)}),
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

    search_fields = ["payment_provider__stripe_account_id"]

    list_display = ["name", "organization", "slug", "payment_provider_url"]

    list_filter = [
        "name",
        "country",
    ]

    inline_type = "stacked"

    inlines = [RevenueProgramBenefitLevelInline, SocialMetaInline]

    form = RevenueProgramAdminForm

    # Overriding this template to add the `admin_limited_select` inclusion tag
    change_form_template = "organizations/revenueprogram_changeform.html"

    def get_readonly_fields(self, request, obj=None):
        # If it's a changeform
        if obj:
            return ["name", "slug", "organization", "mailchimp_server_prefix"]
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

    def payment_provider_url(self, request):
        if request.payment_provider_id:
            link = reverse("admin:organizations_paymentprovider_change", args=(request.payment_provider_id,))
            return mark_safe(f"<a href={link}>{request.payment_provider.stripe_account_id}</a>")

    payment_provider_url.short_description = "Payment Provider"
    payment_provider_url.allow_tags = True


@admin.register(PaymentProvider)
class PaymentProviderAdmin(RevEngineBaseAdmin, CompareVersionAdmin):
    search_fields = ("stripe_account_id",)
    list_display = [
        "stripe_account_id",
        "stripe_product_id",
        "currency",
        "default_payment_provider",
        "stripe_oauth_refresh_token",
        "stripe_verified",
        "revenue_programs",
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

    def has_delete_permission(self, request, obj=None):
        """Block deletion of PaymentProviders that have dependent live or future live pages"""
        if obj and (dependents := obj.get_dependent_pages_with_publication_date()).exists():
            dependents_search_url = (
                f"{reverse('admin:organizations_revenueprogram_changelist')}?q={obj.stripe_account_id}"
            )
            dependent_rps_count = dependents.values("revenue_program").distinct().count()
            msg = mark_safe(
                f"Can't delete this payment provider because it's used by "
                f"{dependents.count()} live or future live contribution page{'s' if dependents.count() > 1 else ''} "
                f"across <a href={dependents_search_url}>{dependent_rps_count} "
                f"revenue program{'s' if dependent_rps_count > 1 else ''}</a>."
            )
            messages.add_message(request, messages.WARNING, msg)
            return False
        return True

    def revenue_programs(self, request, obj=None):
        """Comma-Separated list of revenue programs associated with the requested payment provider."""
        revenue_programs = RevenueProgram.objects.filter(Q(payment_provider_id=request.id))
        return ", ".join(x.name for x in revenue_programs)
