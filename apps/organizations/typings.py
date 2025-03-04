from apps.common.typings import StrEnum


class MailchimpProductType(StrEnum):
    ONE_TIME = "one_time"
    YEAR = "year"
    MONTH = "month"


class MailchimpSegmentType(StrEnum):
    ALL_CONTRIBUTORS = "all_contributors"
    CONTRIBUTOR = "contributor"
    RECURRING_CONTRIBUTOR = "recurring_contributor"
