from django.contrib.auth import get_user_model
from django.forms.models import model_to_dict
from django.urls import reverse

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


@pytest.fixture
def admin_user():
    return get_user_model().objects.create_superuser(email="test@test.com", password="testing")


class MockRequest(object):
    def __init__(self, user=None):
        self.user = user


def test_registered_model_changed_through_registered_view_has_revisions():

    pass


@pytest.mark.parametrize(
    ("factory", "update_attr", "update_value"),
    (
        # (BenefitFactory, "name", "new-name"),
        (BenefitLevelFactory, "name", "new-name"),
        # (ContributionFactory, "reason", "new-reason"),
        # (ContributorFactory, "email", "new-email@foo.com"),
        # (DenyListWordFactory, "word", "new swear word"),
        # (DonationPageFactory, "name", "new name"),
        # (FeatureFactory, "name", "new name"),
        # (FontFactory, "name", "new name"),
        # (OrganizationFactory, "name", "new name"),
        # (PlanFactory, "name", "new name"),
        # (RevenueProgramFactory, "name", "new name"),
        # (StyleFactory, "name", "new name"),
        # (TemplateFactory, "name", "new name"),
    ),
)
@pytest.mark.django_db
def test_registered_model_changed_through_registered_admin_has_revisions(
    factory, update_attr, update_value, admin_user, client
):
    instance = factory()
    model = factory._meta.model
    assert Version.objects.get_for_object(instance).count() == 0
    client.force_login(admin_user)
    update_data = model_to_dict(instance) | {update_attr: update_value}
    # have to send empty strings for None values from dict in form data.
    for k, v in update_data.items():
        if v is None:
            update_data[k] = ""
    change_url = reverse(f"admin:{model._meta.app_label}_{model._meta.model_name}_change", args=[instance.pk])
    client.post(change_url, update_data)
    assert Version.objects.get_for_object(instance).count() == 1
    version = Version.objects.first()
    assert version.revision.user == admin_user
    assert all(word in version.revision.comment.lower() for word in ["changed", update_attr])


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
    """ """
    instance = factory()
    assert Version.objects.get_for_object(instance).count() == 0
    setattr(instance, update_attr, update_value)
    instance.save()
    assert Version.objects.get_for_object(instance).count() == 0
