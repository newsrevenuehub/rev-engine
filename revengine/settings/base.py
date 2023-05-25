"""Django, 3rd party App and 1st party settings for revengine project.

Generated by 'django-admin startproject' using Django 3.0.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.2/ref/settings/
"""
import base64
import json
import os
from datetime import timedelta
from pathlib import Path
from typing import Literal, TypedDict


DEBUG = os.getenv("DJANGO_DEBUG", "False") == "True"
# Set USE_DEBUG_INTERVALS to True if you want recurring payment intervals to
# be truncated for testing (as much as possible, currently).
USE_DEBUG_INTERVALS = os.getenv("USE_DEBUG_INTERVALS", False)

ENABLE_API_BROWSER = os.getenv("ENABLE_API_BROWSER", "false").lower() == "true"

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = os.path.dirname(PROJECT_DIR)

# https://news-revenue-hub.atlassian.net/wiki/spaces/TECH/pages/2014871553/Rev+Engine+NRE+development+deployment+servers+and+environments
ENVIRONMENT = os.getenv("ENVIRONMENT", "unknown")

ADMINS = [("dc", "daniel@fundjournalism.org")]
ROOT_URLCONF = "revengine.urls"
AUTH_USER_MODEL = "users.User"
WSGI_APPLICATION = "revengine.wsgi.application"
# SITE_URL must include scheme and optionally port, https://example.com.
SITE_URL = os.getenv("SITE_URL", "")

# This is only used by HubAdmins, not OrgAdmins, but needs to be named generically as LOGIN_URL
# so our implementation of password reset flow for HubAdmins works as expected.
LOGIN_URL = "/nrhadmin/"

# Django security headers
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "SAMEORIGIN"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# Internationalization
# https://docs.djangoproject.com/en/3.2/topics/i18n/
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_L10N = True
USE_TZ = True
# COUNTRIES is not Django setting, is used in model choice fields, related to I18N.
# First in this list will be default.
# Use the 2-char country code here for Stripe's sake.
COUNTRIES = ["US", "CA"]  # First in this list will be default.
# CURRENCIES is not Django setting, is used in models, related to I18N.
# Map currency-code to symbol.
CurrencyCode = Literal["CAD", "USD"]
CurrencySymbol = Literal["$"]


class CurrencyDict(TypedDict):
    code: CurrencyCode
    symbol: CurrencySymbol


CURRENCIES: CurrencyDict = {"USD": "$", "CAD": "$"}

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.2/howto/static-files/
STATIC_ROOT = os.path.join(BASE_DIR, "public/static")
STATIC_URL = "/static/"
STATICFILES_FINDERS = [
    "django.contrib.staticfiles.finders.FileSystemFinder",
    "django.contrib.staticfiles.finders.AppDirectoriesFinder",
]
STATICFILES_DIRS = [
    os.path.join(PROJECT_DIR, "static"),
]

MEDIA_ROOT = os.path.join(BASE_DIR, "public/media")
MEDIA_URL = "/media/"

# django-storages Settings
MEDIA_STORAGE_BUCKET_NAME = os.getenv("MEDIA_STORAGE_BUCKET_NAME", "")
MEDIA_LOCATION = os.getenv("MEDIA_LOCATION", "")
DEFAULT_FILE_STORAGE = os.getenv("DEFAULT_FILE_STORAGE", "django.core.files.storage.FileSystemStorage")

# Google cloud
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "revenue-engine")
GOOGLE_CLOUD_PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT_ID", None)
#   Pub/Sub
ENABLE_PUBSUB = os.getenv("ENABLE_PUBSUB", "false").lower() == "true"
PAGE_PUBLISHED_TOPIC = os.getenv("PAGE_PUBLISHED_TOPIC", None)
NEW_USER_TOPIC = os.getenv("NEW_USER_TOPIC", None)
#   Secret Manager
ENABLE_GOOGLE_CLOUD_SECRET_MANAGER = os.getenv("ENABLE_GOOGLE_CLOUD_SECRET_MANAGER", "false").lower() == "true"

GS_SERVICE_ACCOUNT = (
    json.loads(base64.b64decode(os.environ["GS_SERVICE_ACCOUNT"])) if os.environ.get("GS_SERVICE_ACCOUNT", None) else {}
)

GS_SERVICE_ACCOUNT = (
    json.loads(base64.b64decode(os.environ["GS_SERVICE_ACCOUNT"])) if os.environ.get("GS_SERVICE_ACCOUNT", None) else {}
)


# Application definition
INSTALLED_APPS = [
    "apps.common",
    "apps.api",
    "apps.users",
    "apps.organizations",
    "apps.pages",
    "apps.emails",
    "apps.contributions",
    "apps.element_media",
    "apps.google_cloud",
    "apps.public",
    "apps.config",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_celery_beat",
    "django_filters",
    "django_json_widget",
    "rest_framework",
    "django_rest_passwordreset",  # NB: this needs to come after rest_framework
    "sorl.thumbnail",
    "sorl_thumbnail_serializer",
    "solo",  # Single row models, e.g. HubSlackIntegration.
    "anymail",  # Email service provider integration.
    "health_check",  # Checks for various conditions and provides reports when anomalous behavior is detected.
    "health_check.db",
    "health_check.cache",
    "health_check.contrib.migrations",
    "health_check.contrib.redis",
    "waffle",  # Django feature flag support.
    "reversion",  # Provides undelete and rollback for models' data.
    "reversion_compare",
    "django_test_migrations.contrib.django_checks.AutoNames",
]

if ENABLE_API_BROWSER:
    INSTALLED_APPS += [
        "drf_yasg",
    ]

MIDDLEWARE = [
    "request_id.middleware.RequestIdMiddleware",
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
    "waffle.middleware.WaffleMiddleware",
]


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            Path(BASE_DIR) / "spa/public",  # Serve SPA via django.
            os.path.join(PROJECT_DIR, "templates"),
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "csp.context_processors.nonce",
            ],
        },
    },
]


# Database
# https://docs.djangoproject.com/en/3.0/ref/settings/#databases

# https://docs.djangoproject.com/en/3.2/ref/settings/#databases
# Default changed to BigAutoField in 3.2 https://docs.djangoproject.com/en/4.0/releases/3.2/#customizing-type-of-auto-created-primary-keys
DEFAULT_AUTO_FIELD = "django.db.models.AutoField"

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
if os.getenv("DATABASE_URL"):
    import dj_database_url

    db_from_env = dj_database_url.config(
        conn_max_age=500,
        ssl_require=os.getenv("DATABASE_SSL", False),
    )
    DATABASES["default"].update(db_from_env)


# Password validation
# https://docs.djangoproject.com/en/3.2/ref/settings/#auth-password-validators
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

## Cache Settings
# Contributions cache set to 30 minutes < CONTRIBUTOR_LONG_TOKEN_LIFETIME
CONTRIBUTION_CACHE_TTL = timedelta(minutes=30)
DEFAULT_CACHE = "default"

REDIS_URL = os.getenv("REDIS_TLS_URL", os.getenv("REDIS_URL", "redis://redis:6379"))
CACHE_HOST = REDIS_URL
CONNECTION_POOL_KWARGS = {}
if CACHE_HOST.startswith("rediss"):
    import ssl

    # See: https://github.com/mirumee/saleor/issues/6926
    CONNECTION_POOL_KWARGS = {
        "ssl_cert_reqs": ssl.CERT_NONE,
    }

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": f"{CACHE_HOST}/0",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "CONNECTION_POOL_KWARGS": CONNECTION_POOL_KWARGS,
        },
    },
}


### Logging Settings
# MIDDLEWARE_LOGGING_CODES is not Django, used by LogFourHundredsMiddleware.
MIDDLEWARE_LOGGING_CODES = [400, 404, 403]
DEFAULT_LOGGER = "warn"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "require_debug_false": {"()": "django.utils.log.RequireDebugFalse"},
        "request_id": {"()": "request_id.logging.RequestIdFilter"},
    },
    "formatters": {
        "basic": {"format": "%(levelname)s request_id=%(request_id)s %(name)s:%(lineno)d - [%(funcName)s] %(message)s"}
    },
    "handlers": {
        "console": {
            "level": LOG_LEVEL,
            "class": "logging.StreamHandler",
            "formatter": "basic",
            "filters": ["request_id"],
        },
        "null": {
            "class": "logging.NullHandler",
        },
    },
    "loggers": {
        # Redefining the logger for the django module
        # prevents invoking the AdminEmailHandler
        "django": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        # don't warn about incorrect http_host
        # see https://docs.djangoproject.com/en/3.2/topics/logging/#django-security
        "django.security.DisallowedHost": {
            "handlers": ["null"],
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
}


### Sentry Settings
SENTRY_ENABLE_FRONTEND = os.getenv("SENTRY_ENABLE_FRONTEND", "false").lower() == "true"
SENTRY_DSN_FRONTEND = os.getenv("SENTRY_DSN_FRONTEND")
SENTRY_ENABLE_BACKEND = os.getenv("SENTRY_ENABLE_BACKEND", "false").lower() == "true"
SENTRY_DSN_BACKEND = os.getenv("SENTRY_DSN_BACKEND")
SENTRY_ENABLE_PII = os.getenv("SENTRY_ENABLE_PII", "true").lower() == "true"


### REST_FRAMEWORK Settings
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

### django-test-migrations
# we ignore waffle and celery beat's migrations because they are beyond our control,
# and dtm complains about their migration file names
DTM_IGNORED_MIGRATIONS = {
    ("waffle", "*"),
    ("django_celery_beat", "*"),
}


### Django-CSP Settings

# TODO: [DEV-2359] Fix CSP violation caused by react-select emotion
ENFORCE_CSP = os.getenv("ENFORCE_CSP", "true").lower() == "true"
if not ENFORCE_CSP:
    CSP_REPORT_ONLY = True
CSP_INCLUDE_NONCE_IN = ("style-src", "script-src")
CSP_REPORTING_ENABLE = os.getenv("CSP_REPORTING_ENABLE", "false").lower() == "true"
if CSP_REPORTING_ENABLE:
    CSP_REPORT_URI = os.getenv("CSP_REPORT_URI")
CSP_DEFAULT_SRC = (
    "'self'",
    "*.fundjournalism.org",
)
CSP_SCRIPT_SRC = (
    "'self'",
    "https://js.stripe.com",
    "https://risk.clearbit.com",
    "https://www.googletagmanager.com",
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
    "https://fonts.googleapis.com",
    "https://maps.googleapis.com",
    "https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/",
)
CSP_IMG_SRC = (
    "*",
    "'self'",
    "blob:",
    "data:",
)
CSP_FONT_SRC = (
    "'self'",
    "data:",
    "https://fonts.gstatic.com",
    "https://use.typekit.net",
    "https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/",
)
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


### https://django-rest-framework-simplejwt.readthedocs.io/en/latest/settings.html
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=float(os.getenv("ACCESS_TOKEN_LIFETIME_HOURS", 12))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=2),
    "UPDATE_LAST_LOGIN": os.getenv("UPDATE_LAST_LOGIN", True),
}

SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "true").lower() == "true"

### sorl-thumbmail Settings
THUMBNAIL_COLORSPACE = None
THUMBNAIL_PRESERVE_FORMAT = True


### Django-reversion Settings
# Add reversion models to admin interface.
ADD_REVERSION_ADMIN = False
REVERSION_COMPARE_IGNORE_NOT_REGISTERED = True


### Stripe Settings
# https://stripe.com/docs/upgrades#api-changelog
STRIPE_API_VERSION = "2020-08-27"  # Stripe API Target Version
DEFAULT_CURRENCY = "usd"
GENERIC_STRIPE_PRODUCT_NAME = "Contribution via RevEngine"
WEBHOOK_URL = r"^revengine-stripe-webhook/"
STRIPE_LIVE_SECRET_KEY = os.getenv("LIVE_HUB_STRIPE_API_SECRET_KEY", "")
STRIPE_TEST_SECRET_KEY = os.getenv("TEST_HUB_STRIPE_API_SECRET_KEY", "")
STRIPE_OAUTH_SCOPE = "read_write"
STRIPE_LIVE_MODE = os.getenv("STRIPE_LIVE_MODE", "false").lower() == "true"
# Get it from the section in the Stripe dashboard where you added the webhook endpoint
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
# this is the list of events that we want to listen for
STRIPE_WEBHOOK_EVENTS = [
    "payment_intent.canceled",
    "payment_intent.payment_failed",
    "payment_intent.succeeded",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "payment_method.attached",
    "invoice.upcoming",
]

HOOKDECK_API_KEY = os.getenv("HOOKDECK_API_KEY", "")
HOOKDECK_STRIPE_WEBHOOK_SOURCE = os.getenv("HOOKDECK_STRIPE_WEBHOOK_SOURCE", "")

### django-healthcheck Settings
# This URL will get pinged when in the `auto_accept_flagged_contributions``
# task. Which ensures the task completes on a schedule.
HEALTHCHECK_URL_AUTO_ACCEPT_FLAGGED_PAYMENTS = os.getenv("HEALTHCHECK_URL_AUTO_ACCEPT_FLAGGED_PAYMENTS")


### Google Tag Manager ID

# When deploying, the SPA gets served via `revengine.views.ReactAppView` which sets this as the value
# for the `gtm_id` context key in `revengine.views.ReactAppView`. In turn, spa.public.index.html
# references `gtm_id`. If this value is defined, a Google Tag Manager script is added to head and GTM
# iframe added to body.
HUB_GTM_ID = os.getenv("HUB_GTM_ID")


### Heroku Settings
HEROKU_APP_NAME = os.getenv("HEROKU_APP_NAME")
HEROKU_API_KEY = os.getenv("HEROKU_API_KEY")
HEROKU_BRANCH = os.getenv("HEROKU_BRANCH")
CF_ZONE_NAME = os.getenv("CF_ZONE_NAME")


### RevEngine (1st Party) Settings

# TODO: [DEV-2010] Isn't DOMAIN_APEX just be SITE_URL without any subdomain?
DOMAIN_APEX = os.getenv("DOMAIN_APEX")
# Application subdomains (that are NOT revenue program slugs)
DASHBOARD_SUBDOMAINS = os.getenv("DASHBOARD_SUBDOMAINS", "www:dashboard:").split(":")

# These values are part of metadata sent to Stripe.
METADATA_SOURCE = os.getenv("METADATA_SOURCE", "rev-engine")
METADATA_SCHEMA_VERSION = os.getenv("METADATA_SCHEMA_VERSION", "1.1")


# This is the interval at which flagged payments will be automatically captured.
# NOTE: Stripe automatically REJECTS flagged payments every 7 days. Make sure
# this delta is less than 6.5 days to be safe.
FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA = 3

## Contributor page / auth Settings.
# Magic Link URL
CONTRIBUTOR_VERIFY_URL = "contributor-verify"
# In format num/[second, minute, hour, day]
# https://www.django-rest-framework.org/api-guide/throttling/#setting-the-throttling-policy
CONTRIBUTOR_MAGIC_LINK_REQUEST_THROTTLE_RATE = os.getenv("CONTRIBUTOR_MAGIC_LINK_REQUEST_THROTTLE_RATE", "6/minute")
# Token key used to distinguish between regular users and contributors See ContributorRefreshToken()
CONTRIBUTOR_ID_CLAIM = "contrib_id"
CONTRIBUTOR_SHORT_TOKEN_LIFETIME = timedelta(minutes=15)
CONTRIBUTOR_LONG_TOKEN_LIFETIME = timedelta(hours=3)

# Name of cookie used to store contributor auth key.
AUTH_COOKIE_KEY = "Authorization"
# Set SAMESITE setting below to 'Strict' to ask receiving browsers not to send this cookie
# across origins. Once this API supports public access, this needs to be loosened.
AUTH_COOKIE_SAMESITE = "Strict"  # or 'Lax' or None

# Salt used in UID and account verification hashes.
ENCRYPTION_SALT = os.getenv("ENCRYPTION_SALT", "")

# Expire account verification URLs after X hours.
ACCOUNT_VERIFICATION_LINK_EXPIRY = 24

## Various HTTP parameter names.
ORG_SLUG_PARAM = "orgSlug"
RP_SLUG_PARAM = "revProgramSlug"
PAGE_SLUG_PARAM = "slug"

## Email and ESP Settings
DEFAULT_FROM_EMAIL = f"noreply@{os.getenv('DOMAIN', 'example.com')}"
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
EMAIL_SUBJECT_PREFIX = "[RevEngine %s] " % ENVIRONMENT.title()
# Revengine template identifiers
EMAIL_DEFAULT_TRANSACTIONAL_SENDER = os.getenv(
    "EMAIL_DEFAULT_TRANSACTIONAL_SENDER", "News Revenue Engine <no-reply@fundjournalism.org>"
)

# Transactional Email
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

EMAIL_DEFAULT_TRANSACTIONAL_SENDER = os.getenv(
    "EMAIL_DEFAULT_TRANSACTIONAL_SENDER", "News Revenue Engine <no-reply@fundjournalism.org>"
)

# password-reset related
#
# This causes our password reset endpoint to return 200 even if user not in db so we don't
# leak info about registered accounts. In this case, no reset email gets sent.
DJANGO_REST_PASSWORDRESET_NO_INFORMATION_LEAKAGE = True
# this is in hours
DJANGO_REST_MULTITOKENAUTH_RESET_TOKEN_EXPIRY_TIME = 24

## BadActor API
# [DEV-2008] the test API shouldn't be here. It shouldn't have a default.
BAD_ACTOR_API_URL = os.getenv("BAD_ACTOR_API_URL", "https://bad-actor-test.fundjournalism.org/v1/bad_actor/")
# NOTE: We've been given keys with some characters that might need escaping as environment variables, eg "$"
BAD_ACTOR_API_KEY = os.getenv("BAD_ACTOR_API_KEY", "testing_123")
BAD_ACTOR_BAD_SCORE = 4
BAD_ACTOR_SUPERBAD_SCORE = 5
BAD_ACTOR_FLAG_SCORE = BAD_ACTOR_BAD_SCORE
BAD_ACTOR_REJECT_SCORE = BAD_ACTOR_SUPERBAD_SCORE
BAD_ACTOR_REJECT_SCORE_FOR_ORG_USERS = BAD_ACTOR_SUPERBAD_SCORE


# This is meant to facilitate testing of the Stripe Account Link flow in local dev environment
# By setting this to "http://localhost:3000" in env, when you go through Stripe Account Link flow,
# on completing the Stripe form, you'll be sent back to localhost:3000 (aka the SPA being served by
# webpack) instead of getting sent to localhost:8000, which is what would happen by default in local
# dev environment.
STRIPE_ACCOUNT_LINK_RETURN_BASE_URL = os.getenv("STRIPE_ACCOUNT_LINK_RETURN_BASE_URL", None)

# These `MAILCHIMP_` values are used by code that makes requests to mailchimp on behalf of org users
MAILCHIMP_CLIENT_ID = os.getenv("MAILCHIMP_CLIENT_ID", None)
MAILCHIMP_CLIENT_SECRET = os.getenv("MAILCHIMP_CLIENT_SECRET", None)

# see https://mailchimp.com/developer/release-notes/message-search-rate-limit-now-enforced/#:~:text=We're%20now%20enforcing%20the,of%20the%20original%2020%20requests.
MAILCHIMP_RATE_LIMIT_RETRY_WAIT_SECONDS = 60


### Front End Environment Variables
SPA_ENV_VARS = {
    "HUB_STRIPE_API_PUB_KEY": os.getenv("SPA_ENV_HUB_STRIPE_API_PUB_KEY"),
    "NRE_MAILCHIMP_CLIENT_ID": MAILCHIMP_CLIENT_ID,
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


CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "cache")
CELERY_CACHE_BACKEND = BROKER_URL
CELERY_IMPORTS = ("apps.emails.tasks",)


RP_MAILCHIMP_LIST_CONFIGURATION_COMPLETE_TOPIC = os.getenv("RP_MAILCHIMP_LIST_CONFIGURATION_COMPLETE_TOPIC")
