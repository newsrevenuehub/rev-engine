# Used in requests to bad actor api that don't involve actual contributions
# TODO: Remove this when https://news-revenue-hub.atlassian.net/browse/DEV-2034  is done
BAD_ACTOR_FAKE_AMOUNT = 10
BAD_ACTOR_CLIENT_FACING_VALIDATION_MESSAGE = "Something went wrong"
EMAIL_VERIFICATION_EMAIL_SUBJECT = "Please verify your email address"
INVALID_TOKEN = "NoTaVaLiDtOkEn"
# This is Django's default max length
PASSWORD_MAX_LENGTH = 128
# This is Django's default min length
PASSWORD_MIN_LENGTH = 8
PASSWORD_NUMERIC_VALIDATION_MESSAGE = "This password is entirely numeric."
PASSWORD_TOO_COMMON_VALIDATION_MESSAGE = "This password is too common."
PASSWORD_TOO_LONG_VALIDATION_MESSAGE = f"Ensure this field has no more than {PASSWORD_MAX_LENGTH} characters."
PASSWORD_TOO_SHORT_VALIDATION_MESSAGE = (
    f"This password is too short. It must contain at least {PASSWORD_MIN_LENGTH} characters."
)
PASSWORD_TOO_SIMILAR_TO_EMAIL_VALIDATION_MESSAGE = "The password is too similar to the email."
PASSWORD_UNEXPECTED_VALIDATION_MESSAGE_SUBSTITUTE = "This password is not valid"
PASSWORD_VALIDATION_EXPECTED_MESSAGES = [
    PASSWORD_NUMERIC_VALIDATION_MESSAGE,
    PASSWORD_TOO_COMMON_VALIDATION_MESSAGE,
    PASSWORD_TOO_LONG_VALIDATION_MESSAGE,
    PASSWORD_TOO_SHORT_VALIDATION_MESSAGE,
    PASSWORD_TOO_SIMILAR_TO_EMAIL_VALIDATION_MESSAGE,
]

FIRST_NAME_MAX_LENGTH = 50
LAST_NAME_MAX_LENGTH = 50
JOB_TITLE_MAX_LENGTH = 50
