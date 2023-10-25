import contextvars
import logging
import os
import uuid

from django.conf import settings

from celery import Celery
from celery.app.log import TaskFormatter
from celery.signals import task_prerun


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
    print(f"Request: {self.request!r}")


### Setup Request Id in Celery Logs

LOGGING_FORMAT = "%(levelname)s %(request_id)s %(module)s:%(lineno)d - [%(funcName)s] %(message)s"

request_id = contextvars.ContextVar("request_id", default=str(uuid.uuid4())[:8])


class RequestIdFilter(logging.Filter):
    def filter(self, record):
        req_id = request_id.get()
        record.request_id = f"[{req_id}]" if req_id else ""
        return True


@task_prerun.connect
def set_request_id(*args, **kwargs):
    req_id = str(uuid.uuid4())[:8]
    request_id.set(req_id)


def setup_celery_logs():
    """
    This function is responsible for adding request ID and formatting logs.

    Default log format:
    # [2023-10-24 18:54:43,789: INFO/MainProcess] mingle: all alone
    # [2023-10-24 18:57:10,818: INFO/ForkPoolWorker-1] send_templated_email[0184e43e-7419-42e6-8fe0-88ddc6eb0019]: Sending email to recipient `a@gmail.com` with subject `Manage your contributions`

    After this function is called, the log format will be:
    # INFO [8da90af9]  mingle:49 - mingle: all alone
    # INFO [61762be0]  strategy:161 - Task send_templated_email[9d9e56f5-cff1-4bd2-93af-feb2d336cd95] received [2023-10-24 18:56:05,900: INFO/ForkPoolWorker-1] send_templated_email[9d9e56f5-cff1-4bd2-93af-feb2d336cd95]: Sending email to recipient `a@gmail.com` with subject `Manage your contributions`
    from which [8da90af9] is the request ID.
    """
    for logger_name, logger in logging.Logger.manager.loggerDict.items():
        if isinstance(logger, logging.Logger):
            logger.propagate = False
            formatter = TaskFormatter(LOGGING_FORMAT)
            handler = logging.StreamHandler()
            handler.setFormatter(formatter)
            handler.addFilter(RequestIdFilter())
            logger.addHandler(handler)


setup_celery_logs()
