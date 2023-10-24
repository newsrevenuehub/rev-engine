import unittest
from unittest.mock import patch

from celery.utils.log import get_task_logger

from revengine.celery import debug_task, request_id, setup_celery_logs


logger = get_task_logger("CELERY_TEST_LOGGER")


def test_debug_task():
    debug_task()


class TestLoggingConfiguration(unittest.TestCase):
    @patch("sys.stderr")  # Mock stderr to capture log output
    def test_log_format(self, mock_stderr):
        # Set up logging with the custom format
        setup_celery_logs()

        # Log a warning message
        logger.warning("This is a warning")

        # Get the log output captured by sys.stderr
        log_output = mock_stderr.write.call_args[0][0].strip()

        # Assert if the log output matches the expected format
        expected_output = f"WARNING [{request_id.get()}]  test_celery:20 - This is a warning"
        assert expected_output in log_output
