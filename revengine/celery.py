import os

from django.conf import settings

from celery import Celery


# set the default Django settings module for the 'celery' program.
current_settings = os.getenv("DJANGO_SETTINGS_MODULE", "revengine.settings.deploy")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", current_settings)

app = Celery("revengine")

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object("django.conf:settings")

# Load task modules from all registered Django app configs.
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")  # noqa: T201 print is used for debugging
