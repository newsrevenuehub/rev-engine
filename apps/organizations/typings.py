from apps.common.typings import StrEnum


class MailchimpProductType(StrEnum):
    ONE_TIME = "one_time"
    # NB: "recurring" is deprecated, but we keep it around so SB doesn't break
    RECURRING = "recurring"


class MailchimpSegmentType(StrEnum):
    ALL_CONTRIBUTORS = "all_contributors"
    CONTRIBUTOR = "contributor"
    RECURRING_CONTRIBUTOR = "recurring_contributor"
