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
          // need to do something better here.
          console.error(e);
        }
      }
    );
  }, []);

  return flags;
}

export default useFeatureFlags;
