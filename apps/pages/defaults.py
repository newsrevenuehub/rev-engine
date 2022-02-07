from uuid import uuid4


def get_default_page_elements():
    """
    When a new DonationPage is created, it should contain these elements by default.
    """
    return [
        {
            "type": "DRichText",
            "uuid": str(uuid4()),
            "content": '<h2 style="text-align:center;">Support our journalism today.</h2>\n<p style="text-align:center;">This work doesn\'t happen without your support. Contribute today!</p>\n',
            "requiredFields": [],
        },
        {
            "type": "DFrequency",
            "uuid": str(uuid4()),
            "content": [
                {"value": "one_time", "isDefault": False, "displayName": "One time"},
                {"value": "month", "isDefault": True, "displayName": "Monthly"},
                {"value": "year", "isDefault": False, "displayName": "Yearly"},
            ],
            "requiredFields": [],
        },
        {
            "type": "DAmount",
            "uuid": str(uuid4()),
            "content": {
                "options": {"year": [120, 180, 365], "month": [10, 15, 25], "one_time": [120, 180, 365]},
                "defaults": {"year": 180, "month": 15, "one_time": 180},
                "allowOther": True,
            },
            "requiredFields": [],
        },
        {
            "type": "DDonorInfo",
            "uuid": str(uuid4()),
            "content": {"askPhone": True},
            "requiredFields": [],
        },
        {"type": "DDonorAddress", "uuid": str(uuid4()), "requiredFields": []},
        {
            "type": "DPayment",
            "uuid": str(uuid4()),
            "content": {"stripe": ["card", "apple", "google", "browser"], "offerPayFees": True, "payFeesDefault": True},
            "requiredFields": [],
        },
        {
            "type": "DRichText",
            "uuid": str(uuid4()),
            "content": '<p style="text-align:center;">Have questions or want to change a recurring donation? Contact us at YOUR EMAIL ADDRESS HERE. <br><br>Prefer to mail a check? Our mailing address is YOUR MAILING ADDRESS HERE.<br><br>Contributions or gifts to YOUR ORGANIZATION NAME HERE are tax deductible. Our tax ID is YOUR TAX ID HERE.&nbsp;</p>\n',
            "requiredFields": [],
        },
    ]
