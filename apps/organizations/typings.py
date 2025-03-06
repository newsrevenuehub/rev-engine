from apps.common import StrEnum


class MailchimpProductType(StrEnum):
    ONE_TIME = "one_time"
    YEAR = "year"
    MONTH = "month"


class MailchimpSegmentType(StrEnum):
    ALL_CONTRIBUTORS = "all_contributors"
    ONE_TIME_CONTRIBUTORS = "one_time_contributor"
    RECURRING_CONTRIBUTORS = "recurring_contributor"
    MONTHLY_CONTRIBUTORS = "monthly_contributor"
    YEARLY_CONTRIBUTORS = "yearly_contributor"


class MailchimpProductName(StrEnum):
    ONE_TIME = "one-time contribution"
    MONTHLY = "monthly contribution"
    YEARLY = "yearly contribution"
