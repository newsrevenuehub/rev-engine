const formatCurrencyAmount = (rawAmount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rawAmount / 100);
};

export default formatCurrencyAmount;
