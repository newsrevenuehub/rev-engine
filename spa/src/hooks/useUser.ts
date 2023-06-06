import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAlert } from 'react-alert';
import { useHistory } from 'react-router-dom';
import * as Sentry from '@sentry/react';

import { USER } from 'ajax/endpoints';
import axios from 'ajax/axios';
import { LS_USER } from 'appSettings';
import { GENERIC_ERROR } from 'constants/textConstants';
import { SIGN_IN } from 'routes';
import { User } from './useUser.types';

const fetchUser = () => {
  return axios.get(USER).then(({ data }) => data);
};

export interface UserHookResult {
  isLoading: UseQueryResult['isLoading'];
  isError: UseQueryResult['isError'];
  refetch: UseQueryResult['refetch'];
  user?: User;
}

function useUser(): UserHookResult {
  const alert = useAlert();
  const history = useHistory();

  const {
    data: user,
    isLoading,
    isError,
    refetch
  } = useQuery(['user'], fetchUser, {
    // this means that user won't be re-fetched for two minutes. After 2 minutes
    // React Query's default "window focus" behavior could trigger a refetch if
    // user is in different window and comes back to this one. Also, this query
    // could refetch before or after the two minutes if it is manually invalidated
    // in the SPA.
    staleTime: 120000,
    // if it's an authentication error, we don't want to retry. if it's some other
    // error we'll retry up to 1 time.
    retry: (failureCount: number, error: { name: string }) => {
      return error.name !== 'AuthenticationError' && failureCount < 1;
    },
    // When user logs in, the authentication endpoint returns user data and it gets
    // stored in localstorage. We should update the localstorage data each time user
    // is refetched so it isn't stale.
    onSuccess: (data: User) => {
      Sentry.setUser({ email: data.email, id: data.id, ip_address: '{{auto}}' });
      localStorage.setItem(LS_USER, JSON.stringify(data));
    },
    onError: (err) => {
      Sentry.setUser(null);
      if (err?.name === 'AuthenticationError') {
        history.push(SIGN_IN);
      } else {
        console.error(err);
        alert.error(GENERIC_ERROR);
      }
    }
  });

  return { refetch, user, isLoading, isError };
}

export default useUser;
