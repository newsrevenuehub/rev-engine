import { useMutation } from '@tanstack/react-query';

import { getStripeAccountLinkCreatePath } from 'ajax/endpoints';
import axios from 'ajax/axios';

function useCreateStripeAccountLink(revenueProgramId) {
  const { mutate, isError, isLoading, data } = useMutation(
    () => axios.post(getStripeAccountLinkCreatePath(revenueProgramId), {}).then(({ data }) => data),
    {
      onSuccess: ({ url }) => {
        if (url) {
          window.location = url;
        }
      }
    }
  );
  return { mutate, isError, isLoading, data };
}

export default useCreateStripeAccountLink;
