/**
 * Returns whether a string value is a number with a certain number of decimal
 * places.
 * @param {string} string - value to validate
 * @param {number} fixed - number of decimal places at most to allow, default 2
 */
function validateInputPositiveFloat(string, fixed = 2) {
  // If anything but digits, a dot, or whitespace is present, reject it.

  if (/[^\d.\s]/.test(string)) {
    return false;
  }

  const parsedNumber = parseFloat(string);

  if (isNaN(parsedNumber) || parsedNumber <= 0) {
    return false;
  }

  const decimals = string.split('.');

  if (decimals.length > 2) {
    // parseFloat thinks 1.2.3 is 1.2--go figure.

    return false;
  }

  return (decimals[1]?.length ?? 0) <= fixed;
}

export default validateInputPositiveFloat;
