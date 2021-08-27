import { useState, useEffect } from 'react';

import { useLocation } from 'react-router-dom';

// Deps
import queryString from 'query-string';

function useQueryString(stringKey) {
  const location = useLocation();
  const [queryValue, setQueryValue] = useState('');

  useEffect(() => {
    const qs = queryString.parse(location.search);
    setQueryValue(qs[stringKey]);
  }, [location.search, stringKey]);

  return queryValue;
}

export default useQueryString;
