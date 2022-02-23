from django.contrib.postgres.fields import CICharField
from django.db import models

from simple_history.models import HistoricalRecords


class DenyListWord(models.Model):
    word = CICharField(max_length=255, unique=True)

    # A history of changes to this model, using django-simple-history.
    history = HistoricalRecords()

    def __str__(self):
        return self.word

    class Meta:
        verbose_name = "Deny-list word"
        verbose_name_plural = "Deny-list words"
