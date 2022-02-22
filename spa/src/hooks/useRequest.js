import axios, { AuthenticationError } from 'ajax/axios';
import { useGlobalContext } from 'components/MainLayout';
import { useParams } from 'react-router-dom';

function useRequest() {
  const { orgSlug, revProgramSlug } = useParams();
  const { getReauth } = useGlobalContext();
  const makeRequest = (config, callbacks) => {
    config.params = config.params || {};
    if (orgSlug) config.params.orgSlug = orgSlug;
    if (revProgramSlug) config.params.revProgramSlug = revProgramSlug;
    console.log('axios config: ', config);
    const { onSuccess, onFailure } = callbacks;
    axios.request(config).then(onSuccess, (e) => {
      if (e instanceof AuthenticationError) {
        // If this custom error type is raised, we know a
        // 401 has been returned and we should offer reauth.
        getReauth(() => makeRequest(config, callbacks));
      } else {
        onFailure(e);
      }
    });
  };

  return (...args) => makeRequest(...args);
}

export default useRequest;
