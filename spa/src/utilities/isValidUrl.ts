export function isValidUrl(value: string, allowEmpty?: boolean) {
  if (allowEmpty && value === '') {
    return true;
  }

  // Some browsers allow whitespace when creating URL objects (and automatically
  // encode them), others don't. We want to block it universally.

  if (/\s/.test(value)) {
    return false;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
