from django.db import models
from django.db.models.functions import Lower


class DenyListWord(models.Model):
    word = models.CharField(max_length=255, unique=True)

    class Meta:
        verbose_name = "Deny-list word"
        verbose_name_plural = "Deny-list words"
        constraints = [
            models.UniqueConstraint(Lower("word"), name="word_unique_case_insensitive"),
        ]

    def __str__(self):
        return self.word
