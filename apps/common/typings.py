from enum import Enum


# TODO @BW: Remove this custom class in favor of built-in StrEnum once upgraded to Python 3.11
# DEV-2886
class StrEnum(str, Enum):
    """A custom Enum class that inherits from str and Enum.

    This class is buil-in to Python >= 3.11 as `StrEnum`, but we're currently on 3.10. Nevertheless,
    this class is a good alternative to using `Literal` for string enums so we're 'rolling our own' for now.
    """

    def __str__(self) -> str:
        return self.value

    def __repr__(self) -> str:
        return str(self)
