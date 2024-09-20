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


class CardBrand(TextChoices):
    AMEX = "amex", "Amex"
    DINERS = "diners", "Diners"
    DISCOVER = "discover", "Discover"
    JCB = "jcb", "JCB"
    MASTERCARD = "mastercard", "Mastercard"
    UNIONPAY = "unionpay", "UnionPay"
    VISA = "visa", "Visa"
    UNKNOWN = "unknown", "Unknown"


class PaymentType(TextChoices):
    ACH_CREDIT_TRANSFER = "ach_credit_transfer", "ACH Credit Transfer"
    ACH_DEBIT = "ach_debit", "ACH Debit"
    ACSS_DEBIT = "acss_debit", "ACSS Debit"
    ALIPAY = "alipay", "AliPay"
    AU_BECS_DEBIT = "au_becs_debit", "AU BECS Debit"
    BANCONTACT = "bancontact", "Bancontact"
    CARD = "card", "Card"
    CARD_PRESENT = "card_present", "Card Present"
    EPS = "eps", "EPS"
    GIROPAY = "giropay", "Giropay"
    IDEAL = "ideal", "Ideal"
    KLARNA = "klarna", "Klarna"
    MULTIBANCO = "multibanco", "Multibanco"
    P24 = "p24", "p24"
    SEPA_DEBIT = "sepa_debit", "Sepa Debit"
    SOFORT = "sofort", "Sofort"
    STRIPE_ACCOUNT = "stripe_account", "Stripe Account"
    WECHAT = "wechat", "WeChat"


class BadActorScores(IntegerChoices):
    INFORMATION = 0, "0 - Information"
    UNKNOWN = 1, "1 - Unknown"
    GOOD = 2, "2 - Good"
    SUSPECT = 3, "3 - Suspect"
    BAD = 4, "4 - Bad"
    SUPERBAD = 5, "5 - Very Bad"
