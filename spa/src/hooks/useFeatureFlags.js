import { useEffect, useState } from 'react';

import { USER } from 'ajax/endpoints';
import useRequest from 'hooks/useRequest';

function useFeatureFlags() {
  const [flags, setFlags] = useState([]);
  const requestUser = useRequest();
  useEffect(() => {
    requestUser(
      {
        method: 'GET',
        url: USER
      },
      {
        onSuccess: ({ data }) => setFlags(data.flags),
        onFailure: (e) => {
          throw new Error('Something unexpected happened in `useFeatureFlags`');
        }
      }
    );
  }, [requestUser]);

  return flags;
}

export default useFeatureFlags;
