"""
Django settings for revengine project.

Generated by 'django-admin startproject' using Django 3.0.

For more information on this file, see
https://docs.djangoproject.com/en/3.0/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.0/ref/settings/
"""

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
import os
from datetime import timedelta


PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = os.path.dirname(PROJECT_DIR)

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.0/howto/deployment/checklist/

DEBUG = os.getenv("DJANGO_DEBUG", "False") == "True"
ENVIRONMENT = os.getenv("ENVIRONMENT", "dev")

# Application definition

INSTALLED_APPS = [
    "apps.common",
    "apps.api",
    "apps.users",
    "apps.organizations",
    "apps.pages",
    "apps.emails",
    "apps.contributions",
    "apps.slack",
    "apps.element_media",
    "apps.public",
    "apps.config",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_celery_beat",
    "rest_framework",
    "django_filters",
    "sorl.thumbnail",
    "sorl_thumbnail_serializer",
    "solo",
    "anymail",
    "django_json_widget",
    "safedelete",
    "simple_history",
    "health_check",
    "health_check.db",
    "health_check.cache",
    "health_check.contrib.migrations",
    "health_check.contrib.redis",
]


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.common.middleware.LogFourHundredsMiddleware",
    "csp.middleware.CSPMiddleware",
    "simple_history.middleware.HistoryRequestMiddleware",
]

ROOT_URLCONF = "revengine.urls"
AUTH_USER_MODEL = "users.User"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            os.path.join(PROJECT_DIR, "templates"),
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# REST_FRAMEWORK CONFIGURATION
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.api.authentication.JWTHttpOnlyCookieAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
        "apps.api.permissions.HasRoleAssignment",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.api.pagination.ApiStandardPagination",
    "PAGE_SIZE": 10,
}

SIMPLE_JWT = {  # https://django-rest-framework-simplejwt.readthedocs.io/en/latest/settings.html
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=float(os.getenv("ACCESS_TOKEN_LIFETIME_HOURS", 12))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=2),
}

CONTRIBUTOR_ID_CLAIM = "contrib_id"
CONTRIBUTOR_SHORT_TOKEN_LIFETIME = timedelta(minutes=5)
CONTRIBUTOR_LONG_TOKEN_LIFETIME = timedelta(hours=3)
CONTRIBUTOR_VERIFY_URL = "contributor-verify"
# In format num/[second, minute, hour, day]
# https://www.django-rest-framework.org/api-guide/throttling/#setting-the-throttling-policy
CONTRIBUTOR_MAGIC_LINK_REQUEST_THROTTLE_RATE = os.getenv("CONTRIBUTOR_MAGIC_LINK_REQUEST_THROTTLE_RATE", "6/minute")

USER_TTL = timedelta(hours=24)


AUTH_COOKIE_KEY = "Authorization"
# Set SAMESITE setting below to 'Strict' to ask recieving browsers not to send this cookie
# across origins. Once this API supports public access, this needs to be loosened.
AUTH_COOKIE_SAMESITE = "Strict"  # or 'Lax' or None

ORG_SLUG_PARAM = "orgSlug"
RP_SLUG_PARAM = "revProgramSlug"
PAGE_SLUG_PARAM = "slug"

WSGI_APPLICATION = "revengine.wsgi.application"


# Database
# https://docs.djangoproject.com/en/3.0/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql_psycopg2",
        "NAME": "revengine",
        "USER": "",
        "PASSWORD": "",
        "HOST": "",
        "PORT": "",
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.AutoField"

if os.getenv("DATABASE_URL"):
    import dj_database_url

    db_from_env = dj_database_url.config(
        conn_max_age=500,
        ssl_require=os.getenv("DATABASE_SSL", False),
    )
    DATABASES["default"].update(db_from_env)


# Password validation
# https://docs.djangoproject.com/en/3.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/3.0/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.0/howto/static-files/

STATICFILES_FINDERS = [
    "django.contrib.staticfiles.finders.FileSystemFinder",
    "django.contrib.staticfiles.finders.AppDirectoriesFinder",
]

STATICFILES_DIRS = [
    os.path.join(PROJECT_DIR, "static"),
]

STATIC_ROOT = os.path.join(BASE_DIR, "public/static")
STATIC_URL = "/static/"

MEDIA_ROOT = os.path.join(BASE_DIR, "public/media")
MEDIA_URL = "/media/"
MEDIA_STORAGE_BUCKET_NAME = os.getenv("MEDIA_STORAGE_BUCKET_NAME", "")
DEFAULT_FILE_STORAGE = os.getenv("DEFAULT_FILE_STORAGE", "django.core.files.storage.FileSystemStorage")

MEDIA_LOCATION = os.getenv("MEDIA_LOCATION", "")


# Logging

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {"require_debug_false": {"()": "django.utils.log.RequireDebugFalse"}},
    "formatters": {"basic": {"format": "%(asctime)s %(name)-20s %(levelname)-8s %(message)s"}},
    "handlers": {
        "console": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "basic",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}

DEFAULT_LOGGER = "warn"


PHONENUMBER_DB_FORMAT = "NATIONAL"
PHONENUMBER_DEFAULT_FORMAT = "NATIONAL"
PHONENUMBER_DEFAULT_REGION = "US"

# Stripe configs
STRIPE_LIVE_SECRET_KEY = os.getenv("LIVE_HUB_STRIPE_API_SECRET_KEY", "")
STRIPE_TEST_SECRET_KEY = os.getenv("TEST_HUB_STRIPE_API_SECRET_KEY", "")
STRIPE_OAUTH_SCOPE = "read_write"
STRIPE_LIVE_MODE = os.environ.get("STRIPE_LIVE_MODE", "false").lower() == "true"

GENERIC_STRIPE_PRODUCT_NAME = "Donation via RevEngine"

# Get it from the section in the Stripe dashboard where you added the webhook endpoint
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

WEBHOOK_URL = r"^revengine-stripe-webhook/"

DEFAULT_CURRENCY = "usd"

STRIPE_WEBHOOK_EVENTS = [
    "payment_intent.canceled",
    "payment_intent.payment_failed",
    "payment_intent.succeeded",
    "customer.subscription.updated",
    "customer.subscription.deleted",
]


# SITE_URL must include scheme and optionally port, https://example.com.
SITE_URL = os.getenv("SITE_URL", "")
# TODO: Isn't DOMAIN_APEX just be SITE_URL without any subdomain?
DOMAIN_APEX = os.getenv("DOMAIN_APEX")

# BadActor API
BAD_ACTOR_API_URL = os.getenv("BAD_ACTOR_API_URL", "https://bad-actor-test.fundjournalism.org/v1/bad_actor/")
# NOTE: We've been given keys with some characters that might need escaping as environment variables, eg "$"
BAD_ACTOR_API_KEY = os.getenv("BAD_ACTOR_API_KEY", "testing_123")

BAD_ACTOR_FAIL_ABOVE = 3

# This is the interval at which flagged payments will be automatically captured.
# NOTE: Stripe automatically REJECTS flagged payments every 7 days. Make sure this delta is less than 6.5 days to be safe.
FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA = timedelta(days=3)

HEALTHCHECK_URL_AUTO_ACCEPT_FLAGGED_PAYMENTS = os.environ.get("HEALTHCHECK_URL_AUTO_ACCEPT_FLAGGED_PAYMENTS")

# Transactional Email
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
EMAIL_SUBJECT_PREFIX = "[RevEngine] "

ADMINS = [("dc", "daniel@fundjournalism.org")]

# Revengine template identifiers
EMAIL_TEMPLATE_IDENTIFIER_MAGIC_LINK_DONOR = os.environ.get(
    "EMAIL_TEMPLATE_IDENTIFIER_MAGIC_LINK_DONOR", "nrh-manage-donations-magic-link"
)

# this is only used by HubAdmins, not OrgAdmins, but needs to be named generically as LOGIN_URL
# so our implementation of password reset flow for HubAdmins works as expected
LOGIN_URL = "/nrhadmin/"

# Set USE_DEBUG_INTERVALS to True if you want recurring payment intervals to be truncated for testing (as much as possible, currently)
USE_DEBUG_INTERVALS = os.getenv("USE_DEBUG_INTERVALS", False)

# Images config
THUMBNAIL_COLORSPACE = None
THUMBNAIL_PRESERVE_FORMAT = True
THUMBNAIL_PRESERVE_FORMAT = True

# Middleware Logging Codes
MIDDLEWARE_LOGGING_CODES = [400, 404, 403]

# First in this list will be default.
# Use the 2-char country code here for Stripe's sake.
COUNTRIES = ["US", "CA"]
# Map currency-code to symbol
CURRENCIES = {"USD": "$", "CAD": "$"}


# Application subdomains (that are NOT revenue program slugs)
DASHBOARD_SUBDOMAINS = os.getenv("DASHBOARD_SUBDOMAINS", "support:www:dashboard:").split(":")
DOMAIN_APEX = os.getenv("DOMAIN_APEX")

CSP_REPORTING_ENABLE = os.environ.get("CSP_REPORTING_ENABLE", "false").lower() == "true"
# Django-CSP configuration
# For now, report only.

# For now, we're drastically relaxing the CSP by allowing 'unsafe-eval' and 'unsafe-inline'. Adding those rules precludes the use of a nonce.
# Restore this nonce setup when we successfully disallow 'unsafe-eval' and 'unsafe-inline'
# CSP_INCLUDE_NONCE_IN = (
#     "style-src",
#     "script-src",
# )
CSP_REPORT_ONLY = os.getenv("CSP_REPORT_ONLY", True)

if CSP_REPORTING_ENABLE:
    CSP_REPORT_URI = os.getenv("CSP_REPORT_URI")

CSP_DEFAULT_SRC = (
    "'self'",
    "*.fundjournalism.org",
)
CSP_SCRIPT_SRC = (
    "'self'",
    "'unsafe-inline'",  # this is gross. Fix me ASAP
    "'unsafe-eval'",  # this is gross. Fix me ASAP
    "https://js.stripe.com",
    "https://risk.clearbit.com",
    "https://www.google-analytics.com",
    "https://maps.googleapis.com",
    "https://www.google.com/recaptcha/",
    "https://www.gstatic.com/recaptcha/",
    "https://pay.google.com",
    "https://connect.facebook.net",
    "https://ajax.googleapis.com",
    "https://use.typekit.net",
)
CSP_STYLE_SRC = (
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",  # this is gross. Fix me ASAP
    "https://maps.googleapis.com",
)
CSP_IMG_SRC = (
    "*",
    "'self'",
    "data:",
)
CSP_FONT_SRC = ("'self'", "data:", "https://fonts.gstatic.com", "https://use.typekit.net")
CSP_FRAME_SRC = (
    "https://js.stripe.com",
    "https://hooks.stripe.com",
    "https://www.google.com/recaptcha/",
    "https://recaptcha.google.com/recaptcha/",
    "https://pay.google.com",
    "https://www.facebook.com",
)
CSP_CONNECT_SRC = (
    "'self'",
    "https://www.google-analytics.com",
    "https://maps.googleapis.com",
    "https://*.ingest.sentry.io",
    "https://risk.clearbit.com",
)
CSP_OBJECT_SRC = ("'none'",)

# More security headers
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "SAMEORIGIN"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# Stripe API Target Version
STRIPE_API_VERSION = "2020-08-27"


# Google Tag Manager ID - Config Vars Heroku
HUB_GTM_ID = os.getenv("HUB_GTM_ID")


# Sentry Configuration
SENTRY_ENABLE_FRONTEND = os.environ.get("SENTRY_ENABLE_FRONTEND", "false").lower() == "true"
SENTRY_DSN_FRONTEND = os.environ.get("SENTRY_DSN_FRONTEND")

SENTRY_ENABLE_BACKEND = os.environ.get("SENTRY_ENABLE_BACKEND", "false").lower() == "true"
SENTRY_DSN_BACKEND = os.environ.get("SENTRY_DSN_BACKEND")


# Front End Environment Variables - Config Vars Heroku
SPA_ENV_VARS = {
    "HUB_STRIPE_API_PUB_KEY": os.getenv("SPA_ENV_HUB_STRIPE_API_PUB_KEY"),
    "CAPTURE_PAGE_SCREENSHOT": os.getenv("SPA_ENV_CAPTURE_PAGE_SCREENSHOT", "false").lower() == "true",
    "SALESFORCE_CAMPAIGN_ID_QUERYPARAM": os.getenv("SPA_ENV_APP_SALESFORCE_CAMPAIGN_ID_QUERYPARAM", "campaign"),
    "FREQUENCY_QUERYPARAM": os.getenv("SPA_ENV_FREQUENCY_QUERYPARAM", "frequency"),
    "AMOUNT_QUERYPARAM": os.getenv("SPA_ENV_AMOUNT_QUERYPARAM", "amount"),
    "REVENGINE_API_VERSION": os.getenv("SPA_ENV_REVENGINE_API_VERSION", "v1"),
    "STRIPE_API_VERSION": STRIPE_API_VERSION,
    "STRIPE_OAUTH_SCOPE": STRIPE_OAUTH_SCOPE,
    "SENTRY_ENABLE_FRONTEND": SENTRY_ENABLE_FRONTEND,
    "SENTRY_DSN_FRONTEND": SENTRY_DSN_FRONTEND,
    "STRIPE_CLIENT_ID": os.getenv("SPA_ENV_STRIPE_CLIENT_ID"),
    "HUB_GOOGLE_MAPS_API_KEY": os.getenv("SPA_ENV_HUB_GOOGLE_MAPS_API_KEY"),
    "HUB_V3_GOOGLE_ANALYTICS_ID": os.getenv("SPA_ENV_HUB_V3_GOOGLE_ANALYTICS_ID"),
    "ENVIRONMENT": ENVIRONMENT,
    "DASHBOARD_SUBDOMAINS": DASHBOARD_SUBDOMAINS,
}

# Meta data static values
METADATA_SOURCE = os.getenv("METADATA_SOURCE", "rev-engine")
METADATA_SCHEMA_VERSION = os.getenv("METADATA_SCHEMA_VERSION", "1.0")
