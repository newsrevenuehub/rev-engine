import { useQuery } from '@tanstack/react-query';

import { USER } from 'ajax/endpoints';
import axios from 'ajax/axios';
import { LS_USER } from 'settings';

const fetchUser = () => {
  return axios.get(USER).then(({ data }) => data);
};

function useUser() {
  const {
    data: user,
    isLoading,
    isError
  } = useQuery(['user'], fetchUser, {
    // this means that user won't be re-fetched for two minutes. After 2 minutes
    // React Query's default "window focus" behavior could trigger a refetch if
    // user is in different window and comes back to this one. Also, this query
    // could refetch before or after the two minutes if it is manually invalidated
    // in the SPA.
    staleTime: 120000,
    // When user logs in, the authentication endpoint returns user data and it gets
    // stored in localstorage. We should update the localstorage data each time user
    // is refetched so it isn't stale.
    onSuccess: (data) => localStorage.setItem(LS_USER, JSON.stringify(data)),
    // this is the minimal side effect we want in this hook if error retrieving user.
    // calling console.error will create a Sentry error. It's up to the calling context
    // to decide what else to do in case of error, which it can do via the returned `isError`
    // boolean.
    onError: (err) => console.error(err)
  });
  return { user, isLoading, isError };
}

export default useUser;
