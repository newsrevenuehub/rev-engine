class UnexpectedUserConfiguration:
    def __init__(self, user, *args, **kwargs):
        message = f"{user} is not configured for accessing this resource"
        super().__init__(message, *args, **kwargs)
