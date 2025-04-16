from functools import partial
from pathlib import Path

from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.forms import ModelForm
from django.urls import reverse
from django.utils.safestring import mark_safe

from rest_framework.serializers import ValidationError as DRFValidationError
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
        """Override get_formset.

        To adjust the properties of the related field such that users are unable to create or edit them inline (only add existing).
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
        """Limit the choices of "benefit_level" inlines to those related by org."""
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
            raise ValidationError(exc.get_full_details()[0]["message"]) from exc
        return self.cleaned_data["tax_id"]


class RevenueProgramBenefitLevelInline(NoRelatedInlineAddEditAdminMixin, ReadOnlyOrgLimitedTabularInlineMixin):
    model = BenefitLevel
    verbose_name = "Benefit level"
    extra = 0


class BenefitLevelBenefit(NoRelatedInlineAddEditAdminMixin, ReadOnlyOrgLimitedTabularInlineMixin):
    model = BenefitLevel.benefits.through
    verbose_name = "Benefit"
    extra = 0

    related_fieldname = "benefit"


@admin.register(Organization)
class OrganizationAdmin(RevEngineBaseAdmin):
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
        (
            None,
            {
                "fields": (
                    "salesforce_id",
                    "stripe_subscription_id",
                    "uuid",
                )
            },
        ),
        (
            "Email Templates",
            {"fields": ("send_receipt_email_via_nre", "disable_reminder_emails")},
        ),
        (
            "Integrations",
            {
                "fields": (
                    "show_connected_to_slack",
                    "show_connected_to_salesforce",
                    "show_connected_to_mailchimp",
                    "show_connected_to_eventbrite",
                    "show_connected_to_google_analytics",
                    "show_connected_to_digestbuilder",
                    "show_connected_to_newspack",
                )
            },
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

    readonly_fields = ["uuid"]

    def save_model(self, request, obj, form, change):
        """Override save_model so we pass update_fields to obj.save().

        We do this because have a Django signal that looks to `update_fields` to determine whether to
        set a default donation page when an org is being configured to be on core plan.

        Note that this approach is somewhat naive and will not work if the model is being saved with
        foreign key or m2m fields, as these do not appear in `.changed_data`.

        This does not create a problem for us now though because no such fields are being set on the organization
        via admin.
        """
        if change:  # if the obj is being changed, not added
            initial_form = self.get_changeform_initial_data(request)
            changed_data = form.changed_data
            update_fields = {x for x in changed_data if initial_form.get(x) != getattr(obj, x)}
            if update_fields:
                obj.save(update_fields=update_fields.union({"modified"}))
            else:
                obj.save()
        else:
            obj.save()


@admin.register(Benefit)
class BenefitAdmin(RevEngineBaseAdmin):
    list_display = ["name", "description", "revenue_program"]

    list_filter = ["revenue_program"]

    fieldsets = ((None, {"fields": ("name", "description", "revenue_program")}),)

    def get_form(self, request, obj, **kwargs):
        form = super().get_form(request, obj, **kwargs)

        # Alphabetize the revenue program list
        rp_field = form.base_fields.get("revenue_program")
        rp_field.queryset = rp_field.queryset.order_by("name")

        return form


@admin.register(BenefitLevel)
class BenefitLevelAdmin(RevEngineBaseAdmin):
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
        """Organization becomes readonly after initial creation."""
        if obj:
            return [*self.readonly_fields, "revenue_program"]
        return self.readonly_fields


@admin.register(RevenueProgram)
class RevenueProgramAdmin(RevEngineBaseAdmin, AdminImageMixin):
    fieldsets = (
        (
            "RevenueProgram",
            {
                "fields": (
                    "name",
                    "slug",
                    "contact_email",
                    "contact_phone",
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
        ("Mailchimp", {"fields": ("mailchimp_server_prefix", "mailchimp_list_id")}),
        ("ActiveCampaign", {"fields": ("activecampaign_server_url",)}),
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

    search_fields = ["name", "slug", "payment_provider__stripe_account_id"]

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

    readonly_fields = ["activecampaign_server_url", "mailchimp_server_prefix", "mailchimp_list_id"]

    def get_readonly_fields(self, request, obj=None):
        # If it's an addform, we can't allow setting default_donation_page until the RevenueProgram has been defined
        # because we need to limit the donation_page choices based on this instance.
        return self.readonly_fields if obj else [*self.readonly_fields, "default_donation_page"]

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

    @admin.display(description="Payment Provider")
    def payment_provider_url(self, request):
        if request.payment_provider_id:
            link = reverse("admin:organizations_paymentprovider_change", args=(request.payment_provider_id,))
            return mark_safe(f"<a href={link}>{request.payment_provider.stripe_account_id}</a>")

    payment_provider_url.short_description = "Payment Provider"
    payment_provider_url.allow_tags = True


@admin.register(PaymentProvider)
class PaymentProviderAdmin(RevEngineBaseAdmin):
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
        """Block deletion of PaymentProviders that have dependent live or future live pages."""
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
