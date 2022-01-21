from django.templatetags.static import static


def get_default_header_logo():
    return static("NewsRevenueHub-Horizontal.png")


def get_default_page_elements():
    return [
        {
            "type": "DRichText",
            "uuid": "f5543c8b-91db-4724-8224-55417790700c",
            "content": '<h2 style="text-align:center;">Support our journalism today.</h2>\n<p style="text-align:center;">This work doesn\'t happen without your support. Contribute today!</p>\n',
            "requiredFields": [],
        },
        {
            "type": "DFrequency",
            "uuid": "b642c18c-2e05-4ba6-bd9a-2c5b60e4a20b",
            "content": [
                {"value": "one_time", "isDefault": False, "displayName": "One time"},
                {"value": "month", "isDefault": True, "displayName": "Monthly"},
                {"value": "year", "isDefault": False, "displayName": "Yearly"},
            ],
            "requiredFields": [],
        },
        {
            "type": "DAmount",
            "uuid": "8b24074e-a458-4b78-bd33-7e966654d745",
            "content": {
                "options": {"year": [120, 180, 365], "month": [10, 15, 25], "one_time": [120, 180, 365]},
                "defaults": {"year": 180, "month": 15, "one_time": 180},
                "allowOther": True,
            },
            "requiredFields": [],
        },
        {
            "type": "DDonorInfo",
            "uuid": "7265c78b-7086-4e94-afc7-34ac4cc43db0",
            "content": {"askPhone": False},
            "requiredFields": [],
        },
        {"type": "DDonorAddress", "uuid": "12927883-3790-46c0-80e7-e77965df6a6a", "requiredFields": []},
        {
            "type": "DPayment",
            "uuid": "4f62dd4d-1aa4-4939-8f1a-f4709dbb303f",
            "content": {"stripe": ["card", "apple", "google", "browser"], "offerPayFees": True, "payFeesDefault": True},
            "requiredFields": [],
        },
        {
            "type": "DRichText",
            "uuid": "e9e2865c-24f2-4a95-b8d6-83622113c32c",
            "content": '<p style="text-align:center;">Have questions or want to change a recurring donation? Contact us at YOUR EMAIL ADDRESS HERE. <br><br>Prefer to mail a check? Our mailing address is YOUR MAILING ADDRESS HERE.<br><br>Contributions or gifts to YOUR ORGANIZATION NAME HERE are tax deductible. Our tax ID is YOUR TAX ID HERE.&nbsp;</p>\n',
            "requiredFields": [],
        },
    ]
