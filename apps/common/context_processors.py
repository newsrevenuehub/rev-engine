from django.conf import settings  # pragma: no cover


def sentry_dsn(request):  # pragma: no cover
    return {"SENTRY_DSN": settings.SENTRY_DSN}


def commit_sha(request):  # pragma: no cover
    return {"COMMIT_SHA": settings.COMMIT_SHA}
