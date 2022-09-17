export const PAYMENT_STATUS = {
  PROCESSING: 'processing',
  PAID: 'paid',
  CANCELED: 'canceled',
  FAILED: 'failed',
  FLAGGED: 'flagged',
  REJECTED: 'rejected'
};

export const CONTRIBUTION_INTERVALS = {
  ONE_TIME: 'one_time',
  MONTHLY: 'month',
  ANNUAL: 'year'
};

export const PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS = [PAYMENT_STATUS.FLAGGED, PAYMENT_STATUS.REJECTED];
