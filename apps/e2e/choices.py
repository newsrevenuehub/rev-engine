from enum import Enum


class E2EOutcome(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PENDING = "pending"
    ERROR = "error"
