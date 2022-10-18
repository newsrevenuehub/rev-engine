import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAlert } from 'react-alert';
import { useHistory } from 'react-router-dom';

import { LIST_STYLES } from 'ajax/endpoints';
import axios from 'ajax/axios';
import { GENERIC_ERROR } from 'constants/textConstants';
import { SIGN_IN } from 'routes';

async function fetchStyles() {
  const { data } = await axios.get(LIST_STYLES);
  return data;
}

function useStyleList() {
  const alert = useAlert();
  const history = useHistory();
  const queryClient = useQueryClient();


  const {
    data: styles,
    isLoading,
    isError
  } = useQuery(['styles'], fetchStyles, {
    initialData: [],
    // if it's an authentication error, we don't want to retry. if it's some other
    // error we'll retry up to 1 time.
    retry: (failureCount: number, error:Error) => {
      return error.name !== 'AuthenticationError' && failureCount < 1;
    },
    onError: (err) => {
      if (err?.name === 'AuthenticationError') {
        history.push(SIGN_IN);
      } else {
        console.error(err);
        alert.error(GENERIC_ERROR);
      }
    }
  });

  return { styles, isLoading, isError, refetch: () => {
    queryClient.invalidateQueries(['styles']);
  }};
}

export default useStyleList;
