/**
 * Returns a formatted currency amount in US cents.
 * @param rawAmount - amount in cents
 * @param omitDecimalsInRoundNumbers - if true, leaves out the `.00` in an
 * amount like 100
 */
const formatCurrencyAmount = (rawAmount: number, omitDecimalsInRoundNumbers = false) => {
  const decimalValue = rawAmount / 100;

  if (omitDecimalsInRoundNumbers && Math.round(decimalValue) === decimalValue) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })
      .format(decimalValue)
      .replace(/\.00$/, '');
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(decimalValue);
};

export default formatCurrencyAmount;
