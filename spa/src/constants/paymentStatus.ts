export type PaymentStatus = 'processing' | 'paid' | 'canceled' | 'failed' | 'flagged' | 'rejected';

export const PAYMENT_STATUS = {
  PROCESSING: 'processing',
  PAID: 'paid',
  CANCELED: 'canceled',
  FAILED: 'failed',
  FLAGGED: 'flagged',
  REJECTED: 'rejected'
};

export const PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS = [PAYMENT_STATUS.FLAGGED, PAYMENT_STATUS.REJECTED];
