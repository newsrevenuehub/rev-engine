/**
 * Returns the root domain from a hostname, e.g. what revenue program slugs
 * should be suffixed with in their published URL. This does *not* do anything
 * with the `HOST_MAP` environment variable. This doesn't handle multiple
 * subdomains correctly, e.g. `one.two.domain.com`.
 */
export function getDomain(hostname = window.location.host) {
  const hostSplit = hostname.split('.');

  if (hostSplit.length < 3) {
    // We don't have a subdomain in the hostname.

    return hostname;
  }

  // Remove the first part of the domain.

  return hostname.replace(/^.*?\./, '');
}

export default getDomain;
