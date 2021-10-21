from pathlib import Path

from django.contrib import admin

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

    def get_readonly_fields(self, request, obj=None):
        if Path(request.path).parts[-1] == "add":
            return []
        return ["name", "slug", "organization"]


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
