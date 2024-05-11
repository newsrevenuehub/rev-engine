class ContributionIgnorableError(Exception):
    """Old base class.

    TODO: [DEV-4050] This gets removed as part of that ticket.

    When that file is removed, this class can be removed as well, and the inheritance in InvalidIntervalError
    and InvalidMetadataError can be removed as well, below.
    """


class InvalidIntervalError(ContributionIgnorableError):
    pass


class InvalidMetadataError(ContributionIgnorableError):
    pass


class InvalidStripeTransactionDataError(Exception):
    pass
