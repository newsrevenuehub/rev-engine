from celery.utils.log import get_task_logger

from revengine.celery import debug_task, request_id, setup_celery_logs


logger = get_task_logger("CELERY_TEST_LOGGER")


def test_debug_task():
    debug_task()


class TestLoggingConfiguration:
    def test_log_format(self, mocker):
        message = "This is a warning"
        mock_stderr = mocker.patch("sys.stderr")

        # Set up logging with the custom format
        setup_celery_logs()

        # Log a warning message
        logger.warning(message)

        # Get the log output captured by sys.stderr
        log_output = mock_stderr.write.call_args[0][0].strip()

        # Assert if the log output matches the expected format
        expected_output = f"WARNING [{request_id.get()}]  test_celery:22 - [test_log_format] {message}"
        assert expected_output in log_output
