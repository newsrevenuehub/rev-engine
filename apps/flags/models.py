from waffle.models import AbstractUserFlag


class Flag(AbstractUserFlag):
    """Custom flag model

    Initially, we are not overriding anything from `AbstractUserFlag`,
    but we know we'll soon be integrating our custom flag model
    with roleassignments, so we're creating a custom flag model at the outset.
    """

    pass
