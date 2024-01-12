import os


CHECKOUT_PAGE_URL = os.environ.get("CHECKOUT_PAGE_URL", "https://billypenn.revengine-staging.org/")
STRIPE_API_KEY = os.environ["STRIPE_API_KEY"]
VISA = "4242424242424242"
MASTER_CARD = "5555555555554444"
REVENUE_PROGRAM_NAME = "Billy Penn"

DATABASE_URL = os.environ["DATABASE_URL"]
