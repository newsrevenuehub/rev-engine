from rest_framework import status
from rest_framework.exceptions import APIException


class ApiConfigurationError(APIException):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = "There was a problem with the API"
    default_code = "api_configuration_error"


class UniquenessConflictException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "A uniqueness constraint was violated"
    default_code = "uniqueness_conflict"
