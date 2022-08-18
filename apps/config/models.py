from django.contrib.postgres.fields import CICharField
from django.db import models


class DenyListWord(models.Model):
    word = CICharField(max_length=255, unique=True)  # CI == Case Insensitive

    class Meta:
        verbose_name = "Deny-list word"
        verbose_name_plural = "Deny-list words"

    def __str__(self):
        return self.word
