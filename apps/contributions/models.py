from django.db import models


class Contributor(models.Model):
    email = models.EmailField()
