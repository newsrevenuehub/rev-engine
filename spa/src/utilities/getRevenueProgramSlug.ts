import { HOST_MAP } from 'appSettings';

/**
 * Gets the subdomain slug (e.g. used to identify the revenue program) for a
 * hostname. This looks for an environment variable, HOST_MAP, and tries to use
 * it to map domain names to revenue program slugs. If the variable can't be
 * parsed as JSON or no matching entry exists, it ignores it.
 */
export function getRevenueProgramSlug(hostname = window.location.host) {
  const hostnameWithoutPort = hostname.replace(/:.+$/, '');

  if (typeof HOST_MAP === 'object' && hostnameWithoutPort in HOST_MAP) {
    return HOST_MAP[hostnameWithoutPort];
  }

  // If we were given a domain without any subdomains, return an empty string.

  const splitHost = hostnameWithoutPort.split('.');

  if (splitHost.length < 3) {
    return '';
  }

  // Return the first part of the domain. Without hostname mapping, we only ever
  // serve one subdomain level, e.g. my-rp.fundjournalism.org, not
  // my-rp.something.fundjournalism.org.

  return splitHost[0];
}
