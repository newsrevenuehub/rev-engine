from django.db.models import IntegerChoices, TextChoices


class BadActorAction(TextChoices):
    CONTRIBUTION = "contribution", "contribution"
    CREATE_ACCOUNT = "create-account", "create-account"


class ContributionInterval(TextChoices):
    ONE_TIME = "one_time", "One-time"
    MONTHLY = "month", "Monthly"
    YEARLY = "year", "Yearly"


class ContributionStatus(TextChoices):
    PROCESSING = "processing", "processing"
    PAID = "paid", "paid"
    CANCELED = "canceled", "canceled"
    FAILED = "failed", "failed"
    FLAGGED = "flagged", "flagged"
    REJECTED = "rejected", "rejected"
    REFUNDED = "refunded", "refunded"
    ABANDONED = "abandoned", "abandoned"


class BadActorScores(IntegerChoices):
    INFORMATION = 0, "0 - Information"
    UNKNOWN = 1, "1 - Unknown"
    GOOD = 2, "2 - Good"
    SUSPECT = 3, "3 - Suspect"
    BAD = 4, "4 - Bad"
    SUPERBAD = 5, "5 - Very Bad"
