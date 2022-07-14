from django.db import models


class Roles(models.TextChoices):
    HUB_ADMIN = "hub_admin", "Hub Admin"
    ORG_ADMIN = "org_admin", "Org Admin"
    RP_ADMIN = "rp_admin", "RP Admin"
