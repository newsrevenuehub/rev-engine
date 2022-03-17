/**
 * getSubdomain will extract a subdomain, or return false if there
 * is none (or if it's www) reliably, given:
 *    The host is not nested (my.company.example.com)
 *    It doesn't contain a country-coded top-level domain (example.co.uk)
 * @param {string} host - window.location.host
 * @returns {string} - empty if no valid subdomain, subdomain string if found
 */
function getSubdomain(host) {
  const splitHost = host.split('.');
  if (splitHost.length < 3) return '';
  if (splitHost[splitHost.length - 2] === 'herokuapp' && splitHost.length === 3) return '';
  if (splitHost[0] === 'www') return '';
  return splitHost[0];
}

export default getSubdomain;
