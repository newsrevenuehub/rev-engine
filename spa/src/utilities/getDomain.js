import getSubdomain from './getSubdomain';

/**
 * getDomain will extract the domain, from the received host url.
 * Is not reliable, given (limitations from function getSubdomain):
 *    The host is not nested (my.company.example.com)
 *    It doesn't contain a country-coded top-level domain (example.co.uk)
 * @param {string} host - window.location.host
 * @returns {string} - domain string
 */
const getDomain = (host) => {
  const splitHost = host.split('.');
  const subdomain = getSubdomain(host);
  return splitHost.filter((_) => _ !== subdomain).join('.');
};

export default getDomain;
