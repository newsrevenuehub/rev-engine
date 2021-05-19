from django.conf import settings  # pragma: no cover


def sentry_dsn(request):
    return {"SENTRY_DSN": settings.SENTRY_DSN}  # pragma: no cover


def commit_sha(request):
    return {"COMMIT_SHA": settings.COMMIT_SHA}  # pragma: no cover
