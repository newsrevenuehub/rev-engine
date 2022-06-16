import pytest
import reversion
from reversion.models import Version

from apps.config.admin import DenyListWordAdmin
from apps.config.models import DenyListWord
from apps.config.tests.factories import DenyListWordFactory
from apps.contributions.admin import ContributionAdmin, ContributorAdmin
from apps.contributions.models import Contribution, Contributor
from apps.contributions.tests.factories import ContributionFactory, ContributorFactory
from apps.organizations.admin import (
    BenefitAdmin,
    BenefitLevelAdmin,
    FeatureAdmin,
    OrganizationAdmin,
    PlanAdmin,
    RevenueProgramAdmin,
)
from apps.organizations.models import (
    Benefit,
    BenefitLevel,
    BenefitLevelBenefit,
    Feature,
    Organization,
    Plan,
    RevenueProgram,
)
from apps.organizations.tests.factories import (
    BenefitFactory,
    BenefitLevelFactory,
    FeatureFactory,
    OrganizationFactory,
    PlanFactory,
    RevenueProgramFactory,
)
from apps.pages.admin import DonationPageAdmin, FontAdmin, StyleAdmin, TemplateAdmin
from apps.pages.models import DonationPage, Font, Style, Template
from apps.pages.tests.factories import (
    DonationPageFactory,
    FontFactory,
    StyleFactory,
    TemplateFactory,
)
from apps.pages.views import PageViewSet, StyleViewSet, TemplateViewSet


expected_registered_model_admins = [
    BenefitAdmin,
    BenefitLevelAdmin,
    ContributionAdmin,
    ContributorAdmin,
    DenyListWordAdmin,
    DonationPageAdmin,
    FeatureAdmin,
    FontAdmin,
    OrganizationAdmin,
    PlanAdmin,
    RevenueProgramAdmin,
    StyleAdmin,
    TemplateAdmin,
]


def test_expected_models_are_registered_with_django_reversion():
    """Show that we have auditable history log for expected models


    NB: We are registering models with reversion via their ModelAdmin instance. This
    causes the underlying model to be registered (without having to touch the model
    code itself).
    """
    expected_registered_models = [
        Benefit,
        BenefitLevel,
        BenefitLevelBenefit,
        Contribution,
        Contributor,
        DenyListWord,
        DonationPage,
        Feature,
        Font,
        Organization,
        Plan,
        RevenueProgram,
        Style,
        Template,
    ]
    assert set(expected_registered_models) == set(reversion.get_registered_models())


def test_expected_views_are_registered_with_django_reversion():
    """Show that expected views are registered with reversion

    NB: by using the `RevisionMixin`, any changes to a model happening through the
    registered view layer will be recorded.
    """
    expected_views = [PageViewSet, StyleViewSet, TemplateViewSet]
    assert all(issubclass(view, reversion.views.RevisionMixin) for view in expected_views)


def test_expected_model_admins_are_registered_with_django_reversion():
    """Show that expected model admins are instances of `VersionAdmin`

    NB: By having a modeladmin inherit from VersionAdmin, the admin's model counterpart
    will automatically be registered with reversion.
    """
    expected_registered_model_admins = [
        BenefitAdmin,
        BenefitLevelAdmin,
        ContributionAdmin,
        ContributorAdmin,
        DenyListWordAdmin,
        DonationPageAdmin,
        FeatureAdmin,
        FontAdmin,
        OrganizationAdmin,
        PlanAdmin,
        RevenueProgramAdmin,
        StyleAdmin,
        TemplateAdmin,
    ]
    assert all(issubclass(ma, reversion.admin.VersionAdmin) for ma in expected_registered_model_admins)


@pytest.mark.parametrize(
    ("factory", "update_attr", "update_value"),
    (
        (BenefitFactory, "name", "new-name"),
        (BenefitLevelFactory, "name", "new-name"),
        (ContributionFactory, "reason", "new-reason"),
        (ContributorFactory, "email", "new-email@foo.com"),
        (DenyListWordFactory, "word", "new swear word"),
        (DonationPageFactory, "name", "new name"),
        (FeatureFactory, "name", "new name"),
        (FontFactory, "name", "new name"),
        (OrganizationFactory, "name", "new name"),
        (PlanFactory, "name", "new name"),
        (RevenueProgramFactory, "name", "new name"),
        (StyleFactory, "name", "new name"),
        (TemplateFactory, "name", "new name"),
    ),
)
@pytest.mark.django_db
def test_registered_model_changed_via_other_not_have_revisions(factory, update_attr, update_value):
    """Show that models registered with django-reversion don't have history saved when via `.save()` outside of admin or...

    ..registered views.

    """
    assert factory._meta.model in reversion.get_registered_models()
    instance = factory()
    assert Version.objects.get_for_object(instance).count() == 0
    setattr(instance, update_attr, update_value)
    instance.save()
    assert Version.objects.get_for_object(instance).count() == 0
