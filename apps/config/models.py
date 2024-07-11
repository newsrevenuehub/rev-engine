from django.db import models


class DenyListWord(models.Model):
    # NB: db_collation here is to make the word case-insensitive
    # see https://docs.djangoproject.com/en/4.2/releases/4.2/#id1 note on CICharField
    word = models.CharField(max_length=255, unique=True, db_collation="case_insensitive")

    class Meta:
        verbose_name = "Deny-list word"
        verbose_name_plural = "Deny-list words"

    def __str__(self):
        return self.word
