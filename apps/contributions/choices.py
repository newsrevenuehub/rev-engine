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


class QuarantineStatus(TextChoices):
    FLAGGED_BY_BAD_ACTOR = "flagged_by_bad_actor", "Flagged by bad actor"
    REJECTED_BY_HUMAN_FRAUD = "rejected_by_human_for_fraud", "Rejected by human for being fraudulent"
    REJECTED_BY_HUMAN_DUPE = "rejected_by_human_for_dupe", "Rejected by human for being a duplicate"
    REJECTED_BY_HUMAN_OTHER = "rejected_by_human_for_other", "Rejected by human for some other reason"
    REJECTED_BY_MACHINE_FOR_BAD_ACTOR = "rejected_by_machine_for_bad_actor", "Rejected by machine for being a bad actor"
    APPROVED_BY_MACHINE_AFTER_WAIT = "approved_by_machine_after_wait", "Approved by machine after waiting"
    APPROVED_BY_HUMAN = "approved_by_human", "Approved by human"
    REJECTED_BY_STRIPE_FOR_FRAUD = "rejected_by_stripe_for_fraud", "Rejected by Stripe for being fraudulent"
    # We use the two choices below for contributions that were rejected before we started tracking quarantine status as a field
    # whose quarantine status value was set by DEV-5528.REJECTED_BY_HUMAN_FOR_UNKNOWN is distinct from "REJECTED_BY_HUMAN_OTHER"
    # retain meaning of "REJECTED_BY_HUMAN_FOR_OTHER" label as a human rejecting for some reason not captured by other statuses.
    REJECTED_BY_HUMAN_FOR_UNKNOWN = "rejected_by_human_for_unknown", "Rejected by human for unknown reason"
    # This is used for contributions that were approved before we started tracking quarantine status as a field. We can't
    # distinguish between human and machine approval, so we use this generic status.
    APPROVED_BY_UKNKOWN = "approved_by_unknown", "Approved by unknown"
