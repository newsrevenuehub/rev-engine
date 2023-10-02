/**
 * A stricter form of parseFloat which only allows a certain number of decimal
 * places, and rejects any trailing invalid characters. If the number cannot be
 * parsed, NaN is returned. Leading and trailing whitespace is allowed.
 */
export function parseFloatStrictly(value: string, maxPlaces = 2) {
  // If anything but a leading minus sign, digits, a dot, or whitespace is
  // present, reject it.

  if (/.-/.test(value) || /[^-\d.\s]/.test(value)) {
    return NaN;
  }

  const decimals = value.split('.');

  // Reject values like 1.2.3.

  if (decimals.length > 2) {
    return NaN;
  }

  return (decimals[1]?.length ?? 0) <= maxPlaces ? parseFloat(value) : NaN;
}
