export const formatDateTime = (isoString) => {
  const dateTime = new Date(isoString);
  return dateTime.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const formatCurrencyAmount = (rawAmount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rawAmount);
};
