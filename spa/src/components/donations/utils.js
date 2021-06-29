import { format } from 'date-fns';

export const formatDateTime = (isoString) => {
  return format(new Date(isoString), "LLL do, yyyy 'at' hh:mm a");
};

export const formatCurrencyAmount = (rawAmount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rawAmount);
};
