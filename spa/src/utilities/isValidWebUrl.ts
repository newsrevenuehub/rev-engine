/**
 * Returns whether a string is a valid web URL, e.g. a http:// or https://. We
 * make a token effort to validate the domain, e.g. rejecting
 * `fundjournalismorg` (because it's missing a period) and `fund journalism.org`
 * but there are probably many invalid URLs this accepts.
 */
export function isValidWebUrl(value: string, allowEmpty?: boolean) {
  if (allowEmpty && value === '') {
    return true;
  }

  // Some browsers allow whitespace when creating URL objects (and automatically
  // encode them), others don't. We want to block it universally.

  if (/\s/.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);

    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }

    if (!url.origin.includes('.')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
