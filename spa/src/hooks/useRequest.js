import axios, { AuthenticationError } from 'ajax/axios';
import { useCallback } from 'react';

import { useGlobalContext } from 'components/MainLayout';

function useRequest() {
  const { getReauth } = useGlobalContext();
  const makeRequest = useCallback(
    async (config, callbacks) => {
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
    },
    [getReauth]
  );
  return makeRequest;
}

export default useRequest;
