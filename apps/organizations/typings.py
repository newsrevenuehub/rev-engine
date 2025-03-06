from apps.common import StrEnum


class MailchimpProductType(StrEnum):
    ONE_TIME = "one_time"
    YEAR = "year"
    MONTH = "month"


class MailchimpSegmentType(StrEnum):
    ALL_CONTRIBUTORS = "all_contributors"
    ONE_TIME_CONTRIBUTORS = "one_time_contributors"
    RECURRING_CONTRIBUTORS = "recurring_contributors"
    MONTHLY_CONTRIBUTORS = "monthly_contributors"
    YEARLY_CONTRIBUTORS = "yearly_contributors"


class MailchimpProductName(StrEnum):
    ONE_TIME = "one-time contribution"
    MONTHLY = "monthly contribution"
    YEARLY = "yearly contribution"
