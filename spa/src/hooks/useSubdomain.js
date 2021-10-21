import getSubdomain from 'utilities/getSubdomain';

function useSubdomain() {
  return getSubdomain(window.location.host);
}

export default useSubdomain;
