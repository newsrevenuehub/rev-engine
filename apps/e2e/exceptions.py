class E2EError(Exception):
    """Base class for E2E errors.

    Contains a screenshot if available.
    """

    def __init__(self, message, screenshot: bytes = None, **kwargs):
        super().__init__(message)
        self.screenshot = screenshot
