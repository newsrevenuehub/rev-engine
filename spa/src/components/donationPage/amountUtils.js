/**
 * Returns the index of an amount in a list of frequency page. If none can be
 * found, this returns -1.
 * @param {Object} page - page object
 * @param {number | string} amount - amount to search for
 * @param {string} frequency - frequency code
 * @returns {number} index of amount
 */
export function getAmountIndex(page, amount, frequency) {
  const amountElement = page?.elements?.find((el) => el.type === 'DAmount');

  if (!amountElement) {
    return -1;
  }

  const parsedAmount = parseFloat(amount);
  const { options } = amountElement?.content;

  if (!options[frequency]) {
    return -1;
  }

  return options[frequency].findIndex((option) => parseFloat(option) === parsedAmount);
}

/**
 * Returns the default contribution amount for a frequency, as configured in a
 * page. If none is configured for the frequency, then the first one listed is
 * returned. If there are no amounts at all configured, this returns undefined.
 * @param {string} frequency - frequency code
 * @param {Object} page - page object
 * @returns {Number} numeric donation
 */
export function getDefaultAmountForFreq(frequency, page) {
  const amountElement = page?.elements?.find(({ type }) => type === 'DAmount');

  if (!amountElement) {
    return;
  }

  const { defaults, options } = amountElement?.content;

  if (!options[frequency]) {
    return;
  }

  // If the default is defined and exists in options, return it. We coerce
  // values to numbers in case the data is malformed, using quoted values
  // instead of numbers.

  const defaultAmount = parseFloat(defaults?.[frequency]);

  if (Number.isFinite(defaultAmount) && getAmountIndex(page, defaultAmount, frequency) !== -1) {
    return defaultAmount;
  }

  // Otherwise, return the first frequency in options.

  return parseFloat(options[frequency]?.[0]);
}
