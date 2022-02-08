from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.dispatch import receiver
from django.shortcuts import reverse

import pycountry
from model_utils.fields import AutoCreatedField, AutoLastModifiedField
from simple_history.signals import post_create_historical_record
from sorl.thumbnail import ImageField as SorlImageField

from apps.common.constants import STATE_CHOICES
from apps.common.utils import get_changes_from_prev_history_obj


class IndexedTimeStampedModel(models.Model):
    created = AutoCreatedField("created", db_index=True)
    modified = AutoLastModifiedField("modified", db_index=True)

    class Meta:
        abstract = True


def get_country_choices():
    """
    returns a tuple of country choices according to pycountry.countries db
    """
    country_choices = []
    for country_code in settings.COUNTRIES:
        country = pycountry.countries.lookup(country_code)
        country_choices.append((country.alpha_2, country.alpha_2))
    return country_choices


class Address(models.Model):
    address1 = models.CharField(max_length=255, blank=True, verbose_name="Address 1")
    address2 = models.CharField(max_length=255, blank=True, verbose_name="Address 2")
    city = models.CharField(max_length=64, blank=True, verbose_name="City")
    state = models.CharField(max_length=2, blank=True, choices=STATE_CHOICES, verbose_name="State/Province")
    postal_code = models.CharField(max_length=9, blank=True, verbose_name="Postal code")
    country = models.CharField(
        max_length=2,
        blank=True,
        choices=get_country_choices(),
        default="US",
        verbose_name="Country",
    )

    def __str__(self):
        address2 = " " + self.address2 if self.address2 else ""
        postal_code = " " + self.postal_code if self.postal_code else ""
        return f"{self.address1}{address2}, {self.city}, {self.state}{postal_code}"


class SocialMeta(models.Model):
    # opengraph truncates titles over 95chars
    title = models.CharField(max_length=95, blank=True)
    description = models.TextField(blank=True)
    url = models.URLField(blank=True)
    card = SorlImageField(null=True, blank=True)

    def __str__(self):
        related = ""
        if hasattr(self, "revenueprogram"):
            related = ("revenueprogram", "Revenue Program")
        if related:
            return f'Social media Metatags for {related[1]} "{getattr(self, related[0])}"'
        return f"Social media Metatags: {self.title}"


class RevEngineHistoricalChange(models.Model):
    """
    A model for tracking the changes to other models across the project.

    Note: django-simple-history tracks the changes to each model in its own database
    tables (for example, HistoricalOrganization), and the changes for each model
    are visible from that model's detail page in the Django admin (for example,
    /nrhadmin/organizations/organization/1/history/). The RevEngineHistoricalChange
    model exists solely for the purpose of displaying all of the changes to all
    of the models in 1 place in the Django admin.
    """

    SIMPLE_HISTORY_TYPE_CREATED = "+"
    SIMPLE_HISTORY_TYPE_CHANGED = "~"
    SIMPLE_HISTORY_TYPE_DELETED = "-"
    HISTORY_TYPE_CHOICES = [
        (SIMPLE_HISTORY_TYPE_CREATED, "Created"),
        (SIMPLE_HISTORY_TYPE_CHANGED, "Changed"),
        (SIMPLE_HISTORY_TYPE_DELETED, "Deleted"),
    ]

    # Fields to identify the object that had the change.
    app_label = models.CharField(max_length=40)
    model = models.CharField(max_length=40)
    object_id = models.PositiveSmallIntegerField()

    # Fields to give more information about the change.
    history_date = models.DateTimeField(verbose_name="Date/Time")
    history_type = models.CharField(
        verbose_name="Comment",
        max_length=1,
        choices=HISTORY_TYPE_CHOICES,
    )
    history_user = models.ForeignKey(
        get_user_model(), verbose_name="Changed By", blank=True, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    history_change_reason = models.CharField(verbose_name="Change Reason", max_length=255, blank=True)
    changes_html = models.CharField(max_length=1000, blank=True)

    class Meta:
        verbose_name_plural = "Historial Changes"

    def get_object_history_admin_url(self):
        """Return the URL in the Django admin for the object's history changelist."""
        return reverse(f"admin:{self.app_label}_{self.model}_history", kwargs={"object_id": self.object_id})


@receiver(post_create_historical_record)
def post_create_historical_record_callback(sender, **kwargs):
    """
    Create a RevEngineHistoricalChange object for this change.

    Whenever django_simple_history creates an instance of one of its historical_*
    objects, we also create an instance of a RevEngineHistoricalChange.
    """
    history_instance = kwargs["history_instance"]
    changes_list = get_changes_from_prev_history_obj(history_instance)

    # Decide if a RevEngineHistoricalChange object should be created:
    #   - if the user has made changes, then create a RevEngineHistoricalChange object
    #   - if the user is creating or deleting an object, then create a
    #     RevEngineHistoricalChange object
    #   - otherwise, do not create a RevEngineHistoricalChange object
    need_to_create_historical_obj = False
    if changes_list:
        need_to_create_historical_obj = True
    elif history_instance.history_type in [
        RevEngineHistoricalChange.SIMPLE_HISTORY_TYPE_CREATED,
        RevEngineHistoricalChange.SIMPLE_HISTORY_TYPE_DELETED,
    ]:
        need_to_create_historical_obj = True
    # Create a RevEngineHistoricalChange.
    if need_to_create_historical_obj:
        RevEngineHistoricalChange.objects.create(
            app_label=kwargs["instance"]._meta.app_label,
            model=kwargs["instance"]._meta.model_name,
            object_id=kwargs["instance"].id,
            history_date=history_instance.history_date,
            history_type=history_instance.history_type,
            history_user=history_instance.history_user,
            history_change_reason=history_instance.history_change_reason or "",
            changes_html=".<br><br>".join(changes_list),
        )
