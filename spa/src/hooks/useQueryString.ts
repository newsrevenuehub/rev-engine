import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Returns the value of a querystring param like `?key=value`.
 * - This value may be either an empty string or null.
 * - The key is case-sensitive.
 */
export function useQueryString(key: string) {
  const { search } = useLocation();

  return useMemo(() => new URLSearchParams(search).get(key), [key, search]);
}

export default useQueryString;
