from celery.utils.log import get_task_logger

from revengine.celery import request_id, setup_celery_logs


logger = get_task_logger("CELERY_TEST_LOGGER")


class TestLoggingConfiguration:
    def test_log_format(self, mocker):
        message = "This is a warning"
        mock_stderr = mocker.patch("sys.stderr")

        # Set up logging with the custom format
        setup_celery_logs()

        # Log a warning message
        logger.warning(message)

        assert (
            f"WARNING [{request_id.get()}] test_celery:22 - [test_log_format] {message}"
            in mock_stderr.write.call_args[0][0]
        )

    def test_undefined_request_id(self, mocker):
        request_id.set(None)

        message = "This is a warning"
        mock_stderr = mocker.patch("sys.stderr")

        # Set up logging with the custom format
        setup_celery_logs()

        # Log a warning message
        logger.warning(message)

        assert f"WARNING  test_celery:39 - [test_undefined_request_id] {message}" in mock_stderr.write.call_args[0][0]
