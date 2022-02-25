import axios, { AuthenticationError } from 'ajax/axios';
import { useDashboardContext } from 'components/dashboard/Dashboard';
import { useParams } from 'react-router-dom';

function useRequest() {
  const params = useParams();
  const dashboardContext = useDashboardContext();

  const makeRequest = (config, callbacks) => {
    updateConfigParamsWithParams(config, params);
    const { onSuccess, onFailure } = callbacks;
    axios.request(config).then(onSuccess, (e) => {
      if (dashboardContext && e instanceof AuthenticationError) {
        // We take dashboardContext being falsey as an indication that this useRequest is
        // occuring outside of an authenticated context. Otherwise, if this custom error
        // type is raised, we know a 401 has been returned and we should offer reauth.
        dashboardContext.getReauth(() => makeRequest(config, callbacks));
      } else {
        onFailure(e);
      }
    });
  };

  return (...args) => makeRequest(...args);
}

export default useRequest;

function updateConfigParamsWithParams(config, params = {}) {
  const { orgSlug, revProgramSlug } = params;
  config.params = config.params || {};
  if (orgSlug && !config.params.orgSlug) config.params.orgSlug = orgSlug;
  if (revProgramSlug && !config.params.revProgramSlug) config.params.revProgramSlug = revProgramSlug;
}
