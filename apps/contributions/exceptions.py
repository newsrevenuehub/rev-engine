class ContributionIgnorableError(Exception):
    """

    This is an old base class that is only used in stripe-contributions provider, which will
    not be around much longer.


    When that file is removed, this class can be removed as well, and the inheritance in InvalidIntervalError
    and InvalidMetadataError can be removed as well, below.

    TODO: [DEV-4050] This gets removed as part of that ticket.
    """

    pass


class InvalidIntervalError(ContributionIgnorableError):
    pass


class InvalidMetadataError(ContributionIgnorableError):
    pass


class InvalidStripeTransactionDataError(Exception):
    pass
