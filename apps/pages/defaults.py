from uuid import uuid4


AMOUNT = "DAmount"
BENEFITS = "DBenefits"
CONTRIBUTOR_ADDRESS = "DDonorAddress"
CONTRIBUTOR_INFO = "DDonorInfo"
FREQUENCY = "DFrequency"
IMAGE = "DImage"
PAYMENT = "DPayment"
REASON = "DReason"
RICH_TEXT = "DRichText"
SWAG = "DSwag"


DEFAULT_PERMITTED_PAGE_ELEMENTS = [AMOUNT, CONTRIBUTOR_ADDRESS, CONTRIBUTOR_INFO, FREQUENCY, PAYMENT, REASON, RICH_TEXT]

DEFAULT_PERMITTED_SIDEBAR_ELEMENTS = [
    RICH_TEXT,
    IMAGE,
]


def get_default_page_elements():
    """
    When a new DonationPage is created, it should contain these elements by default.
    """
    return [
        {
            "type": RICH_TEXT,
            "uuid": str(uuid4()),
            "content": '<h2 style="text-align:center;">Support our journalism today.</h2>\n<p style="text-align:center;">This work doesn\'t happen without your support. Contribute today!</p>\n',
            "requiredFields": [],
        },
        {
            "type": FREQUENCY,
            "uuid": str(uuid4()),
            "content": [
                {"value": "one_time", "isDefault": False},
                {"value": "month", "isDefault": True},
                {"value": "year", "isDefault": False},
            ],
            "requiredFields": [],
        },
        {
            "type": AMOUNT,
            "uuid": str(uuid4()),
            "content": {
                "options": {"year": [120, 180, 365], "month": [10, 15, 25], "one_time": [120, 180, 365]},
                "defaults": {"year": 180, "month": 15, "one_time": 180},
                "allowOther": True,
            },
            "requiredFields": [],
        },
        {
            "type": CONTRIBUTOR_INFO,
            "uuid": str(uuid4()),
            "content": {"askPhone": True},
            "requiredFields": [],
        },
        {
            "type": CONTRIBUTOR_ADDRESS,
            "uuid": str(uuid4()),
            "requiredFields": [
                "mailing_street",
                "mailing_city",
                "mailing_state",
                "mailing_postal_code",
                "mailing_country",
            ],
        },
        {
            "type": PAYMENT,
            "uuid": str(uuid4()),
            "content": {"stripe": ["card", "apple", "google", "browser"], "offerPayFees": True, "payFeesDefault": True},
            "requiredFields": [],
        },
        {
            "type": REASON,
            "uuid": str(uuid4()),
            "content": {"askReason": True, "reasons": [], "askHonoree": False, "askInMemoryOf": False},
            "requiredFields": [],
        },
        {
            "type": RICH_TEXT,
            "uuid": str(uuid4()),
            "content": '<p style="text-align:center;">Have questions or want to change a recurring contribution? Contact us at YOUR EMAIL ADDRESS HERE. <br><br>Prefer to mail a check? Our mailing address is YOUR MAILING ADDRESS HERE.<br><br>Contributions or gifts to YOUR ORGANIZATION NAME HERE are tax deductible. Our tax ID is YOUR TAX ID HERE.&nbsp;</p>\n',
            "requiredFields": [],
        },
    ]
