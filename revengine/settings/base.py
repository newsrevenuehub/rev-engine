"""Django, 3rd party App and 1st party settings for revengine project.

Generated by 'django-admin startproject' using Django 3.0.

For more information on this file, see
https://docs.djangoproject.com/en/3.0/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.0/ref/settings/
"""

import os
from datetime import timedelta


DEBUG = os.getenv("DJANGO_DEBUG", "False") == "True"
# Set USE_DEBUG_INTERVALS to True if you want recurring payment intervals to
# be truncated for testing (as much as possible, currently).
USE_DEBUG_INTERVALS = os.getenv("USE_DEBUG_INTERVALS", False)

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = os.path.dirname(PROJECT_DIR)

# https://news-revenue-hub.atlassian.net/wiki/spaces/TECH/pages/2014871553/Rev+Engine+NRE+development+deployment+servers+and+environments
ENVIRONMENT = os.getenv("ENVIRONMENT", "dev")

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
# https://docs.djangoproject.com/en/3.0/topics/i18n/
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_L10N = True
USE_TZ = True
# COUNTRIES is not Djanog setting, is used in model choice fields, related to I18N.
# First in this list will be default.
# Use the 2-char country code here for Stripe's sake.
COUNTRIES = ["US", "CA"]  # First in this list will be default.
# CURRENCIES is not Djanog setting, is used in models, related to I18N.
# Map currency-code to symbol.
CURRENCIES = {"USD": "$", "CAD": "$"}

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.0/howto/static-files/
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
# TODO: DEFAULT_FILE_STORAGE doesn't seem to be referenced anywhere in code.
DEFAULT_FILE_STORAGE = os.getenv("DEFAULT_FILE_STORAGE", "django.core.files.storage.FileSystemStorage")

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
    "django_filters",
    "django_json_widget",
    "rest_framework",
    "sorl.thumbnail",
    "sorl_thumbnail_serializer",
    "solo",  # Single row models, e.g. HubSlackInteration.
    "anymail",  # Email service provider integration.
    "health_check",  # Checks for various conditions and provides reports when anomalous behavior is detected.
    "health_check.db",
    "health_check.cache",
    "health_check.contrib.migrations",
    "health_check.contrib.redis",
    "waffle",  # Djanog feature flag support.
    "reversion",  # Provides undelete and rollback for models' data.
    "reversion_compare",
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
    "waffle.middleware.WaffleMiddleware",
]

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

# https://docs.djangoproject.com/en/3.0/ref/settings/#databases
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

### Logging Settings
# MIDDLEWARE_LOGGING_CODES is not Django, used by LogFourHundredsMiddleware.
MIDDLEWARE_LOGGING_CODES = [400, 404, 403]
DEFAULT_LOGGER = "warn"
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
        "null": {
            "class": "logging.NullHandler",
        },
    },
    "loggers": {
        # Redefining the logger for the django module
        # prevents invoking the AdminEmailHandler
        "django": {
            "handlers": ["console"],
            "level": "INFO",
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
        "level": "INFO",
    },
}


### Sentry Settings
SENTRY_ENABLE_FRONTEND = os.getenv("SENTRY_ENABLE_FRONTEND", "false").lower() == "true"
SENTRY_DSN_FRONTEND = os.getenv("SENTRY_DSN_FRONTEND")
SENTRY_ENABLE_BACKEND = os.getenv("SENTRY_ENABLE_BACKEND", "false").lower() == "true"
SENTRY_DSN_BACKEND = os.getenv("SENTRY_DSN_BACKEND")


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


### Django-CSP Settings

# Note from Ben: As best I can tell, these CSP settings are related to using Google
# Tag Manager with a content security policy (see:
# https://developers.google.com/tag-platform/tag-manager/web/csp ). I don't have context
# for business logic requiring CSP in GTM.

# For now, report only.
# For now, we're drastically relaxing the CSP by allowing 'unsafe-eval' and
# 'unsafe-inline'. Adding those rules precludes the use of a nonce.
# Restore this once setup when we successfully disallow 'unsafe-eval' and 'unsafe-inline'
# CSP_INCLUDE_NONCE_IN = (
#     "style-src",
#     "script-src",
# )
CSP_REPORTING_ENABLE = os.getenv("CSP_REPORTING_ENABLE", "false").lower() == "true"
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


### https://django-rest-framework-simplejwt.readthedocs.io/en/latest/settings.html
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=float(os.getenv("ACCESS_TOKEN_LIFETIME_HOURS", 12))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=2),
}

SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "true").lower() == "true"

### sorl-thumbmail Settings
THUMBNAIL_COLORSPACE = None
THUMBNAIL_PRESERVE_FORMAT = True
THUMBNAIL_PRESERVE_FORMAT = True


### reversion Settings
# Add reversion models to admin interface.
ADD_REVERSION_ADMIN = True


### Stripe Settings
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
STRIPE_WEBHOOK_EVENTS = [
    "payment_intent.canceled",
    "payment_intent.payment_failed",
    "payment_intent.succeeded",
    "customer.subscription.updated",
    "customer.subscription.deleted",
]

### django-healthcheck Settings

# This URL will get pinged when in the `auto_accept_flagged_contributions`` task
HEALTHCHECK_URL_AUTO_ACCEPT_FLAGGED_PAYMENTS = os.getenv("HEALTHCHECK_URL_AUTO_ACCEPT_FLAGGED_PAYMENTS")


### Google Tag Manager ID - Config Vars Heroku

# When deploying, the SPA gets served via `revengine.views.ReactAppView` which sets this as the value
# for the `gtm_id` context key in `revengine.views.ReactAppView`. In turn, spa.public.index.html
# references `gtm_id`. If this value is defined, a Google Tag Manager script is added to head and GTM
# iframe added to body.
HUB_GTM_ID = os.getenv("HUB_GTM_ID")


### Heroku Settings
HEROKU_APP_NAME = os.getenv("HEROKU_APP_NAME")
HEROKU_BRANCH = os.getenv("HEROKU_BRANCH")
CF_ZONE_NAME = os.getenv("CF_ZONE_NAME")


### Django-phonenumber Settings
# TODO: These appear to be for django-phonenumber-field which isn't in apps, isn't imported, but is in poetry.
PHONENUMBER_DB_FORMAT = "NATIONAL"
PHONENUMBER_DEFAULT_FORMAT = "NATIONAL"
PHONENUMBER_DEFAULT_REGION = "US"


### RevEngine (1st Party) Settings

# TODO: Isn't DOMAIN_APEX just be SITE_URL without any subdomain?
DOMAIN_APEX = os.getenv("DOMAIN_APEX")
# Application subdomains (that are NOT revenue program slugs)
DASHBOARD_SUBDOMAINS = os.getenv("DASHBOARD_SUBDOMAINS", "www:dashboard:").split(":")

# These values are used in `ContributionMetadataSerializer`, which in turn
# gets used in the abstract PaymentManager base class. They appear
# to be related to how payment provider meta data gets serialized in PaymentManager and
# its subclasses.
METADATA_SOURCE = os.getenv("METADATA_SOURCE", "rev-engine")
METADATA_SCHEMA_VERSION = os.getenv("METADATA_SCHEMA_VERSION", "1.0")


# This is the interval at which flagged payments will be automatically captured.
# NOTE: Stripe automatically REJECTS flagged payments every 7 days. Make sure
# this delta is less than 6.5 days to be safe.
FLAGGED_PAYMENT_AUTO_ACCEPT_DELTA = timedelta(days=3)

# TODO: USER_TTL is not referenced anywhere in codebase.
USER_TTL = timedelta(hours=24)

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
# Set SAMESITE setting below to 'Strict' to ask recieving browsers not to send this cookie
# across origins. Once this API supports public access, this needs to be loosened.
AUTH_COOKIE_SAMESITE = "Strict"  # or 'Lax' or None

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

## BadActor API
BAD_ACTOR_API_URL = os.getenv("BAD_ACTOR_API_URL", "https://bad-actor-test.fundjournalism.org/v1/bad_actor/")
# NOTE: We've been given keys with some characters that might need escaping as environment variables, eg "$"
BAD_ACTOR_API_KEY = os.getenv("BAD_ACTOR_API_KEY", "testing_123")
BAD_ACTOR_FAIL_ABOVE = 3


### Front End Environment Variables - Config Vars Heroku
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
