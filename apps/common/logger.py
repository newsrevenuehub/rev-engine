import contextvars
import logging
import uuid

from celery.app.log import TaskFormatter
from celery.signals import task_prerun


LOGGING_FORMAT = "%(levelname)s %(request_id)s %(module)s:%(lineno)d - %(message)s"

request_id = contextvars.ContextVar("request_id", default=str(uuid.uuid4())[:8])


class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = ""
        req_id = request_id.get()
        if req_id:
            record.request_id = f"[{req_id}] "
        return True


@task_prerun.connect
def set_request_id(*args, **kwargs):
    req_id = str(uuid.uuid4())[:8]
    request_id.set(req_id)


def setup_logs():
    for logger_name, logger in logging.Logger.manager.loggerDict.items():
        if isinstance(logger, logging.Logger):
            logger.propagate = False
            formatter = TaskFormatter(LOGGING_FORMAT)
            handler = logging.StreamHandler()
            handler.setFormatter(formatter)
            handler.addFilter(RequestIdFilter())
            logger.addHandler(handler)
