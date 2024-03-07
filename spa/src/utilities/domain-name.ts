import { HOST_MAP } from 'appSettings';

/**
 * Gets the domain slug (e.g. used to identify the revenue program) for a
 * hostname. This looks for an environment variable, HOST_MAP, and tries to use
 * it to map domain names to revenue program slugs. If the variable can't be
 * parsed as JSON or no matching entry exists, it ignores it.
 */
export function getRevenueProgramSlug(hostname = window.location.host) {
  const hostnameWithoutPort = hostname.replace(/:.+$/, '');

  if (typeof HOST_MAP === 'string') {
    try {
      const map = JSON.parse(HOST_MAP);

      if (hostnameWithoutPort in map) {
        return map[hostnameWithoutPort];
      }
    } catch {
      // Continue silently. Either the variable isn't set or is malformed JSON.
    }
  }

  // TODO is this good enough?
  return hostnameWithoutPort.split('.')[0];
}
