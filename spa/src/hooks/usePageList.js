import { useQuery } from '@tanstack/react-query';
import { useAlert } from 'react-alert';
import { useHistory } from 'react-router-dom';

import { LIST_PAGES } from 'ajax/endpoints';
import axios from 'ajax/axios';
import { GENERIC_ERROR } from 'constants/textConstants';
import { SIGN_IN } from 'routes';

async function fetchPages() {
  const { data } = await axios.get(LIST_PAGES);
  return data;
}

function usePagesList() {
  const alert = useAlert();
  const history = useHistory();

  const {
    data: pages,
    isLoading,
    isError
  } = useQuery(['pages'], fetchPages, {
    initialData: [],
    // if it's an authentication error, we don't want to retry. if it's some other
    // error we'll retry up to 1 time.
    retry: (failureCount, error) => {
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
  return { pages, isLoading, isError };
}

export default usePagesList;
