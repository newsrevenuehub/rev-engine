export function isValidUrl(value: string, allowEmpty?: boolean) {
  if (allowEmpty && value === '') {
    return true;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
