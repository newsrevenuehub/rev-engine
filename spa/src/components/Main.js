import { useState, useContext, createContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocation } from 'react-router-dom';

import * as S from './Main.styled';

import { USER } from 'ajax/endpoints';
import Dashboard from 'components/dashboard/Dashboard';
import Verify from 'components/account/Verify';

import { useConfigureAnalytics } from './analytics';
import { CONTENT_SLUG, VERIFY_EMAIL_SUCCESS } from 'routes';
import PageContextProvider from './dashboard/PageContext';

import { useUserContext } from './UserContext';
import axios from 'ajax/axios';

const FeatureFlagsProviderContext = createContext(null);

const fetchUser = () => {
  return axios.get(USER).then(({ data }) => data);
};

function Main() {
  useConfigureAnalytics();
  const [featureFlags, setFeatureFlags] = useState();
  const [user, setUser] = useState();
  const { setUser: setUserContext } = useUserContext();

  const { isLoading } = useQuery(['user'], fetchUser, {
    onSuccess: (data) => {
      setFeatureFlags(data.flags);
      setUser(data);
      setUserContext(data);
    }
  });

  const { pathname } = useLocation();
  const isVerifyEmailPath = pathname.includes(VERIFY_EMAIL_SUCCESS);
  if (user) {
    if (!user.email_verified && !isVerifyEmailPath) {
      return <Redirect to={VERIFY_EMAIL_SUCCESS} />;
    }

    if (user.email_verified && isVerifyEmailPath) {
      return <Redirect to={CONTENT_SLUG} />;
    }
  }

  const showVerifyScreen = !isLoading && isVerifyEmailPath;

  return (
    <FeatureFlagsProviderContext.Provider value={{ featureFlags }}>
      <PageContextProvider>
        {showVerifyScreen ? (
          <Verify />
        ) : (
          !isLoading && (
            <S.Main>
              <S.MainContent>
                <Dashboard />
              </S.MainContent>
            </S.Main>
          )
        )}
      </PageContextProvider>
    </FeatureFlagsProviderContext.Provider>
  );
}

export const useFeatureFlagsProviderContext = () => useContext(FeatureFlagsProviderContext);

export default Main;
