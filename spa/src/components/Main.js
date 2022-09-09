import { useState, useContext, createContext, useEffect } from 'react';
import { Redirect, useLocation } from 'react-router-dom';

import * as S from './Main.styled';

import { USER } from 'ajax/endpoints';
import Dashboard from 'components/dashboard/Dashboard';
import Verify from 'components/account/Verify';

import useRequest from 'hooks/useRequest';
import { useConfigureAnalytics } from './analytics';
import { CONTENT_SLUG, VERIFY_EMAIL_SUCCESS } from 'routes';
import PageContextProvider from './dashboard/PageContext';

const FeatureFlagsProviderContext = createContext(null);
const UserDataProviderContext = createContext(null);

function Main() {
  useConfigureAnalytics();

  const [loadingFlags, setLoadingFlags] = useState(true);
  const [featureFlags, setFeatureFlags] = useState();
  const [userData, setUserData] = useState();

  const requestUser = useRequest();

  useEffect(() => {
    setLoadingFlags(true);
    requestUser(
      {
        method: 'GET',
        url: USER
      },
      {
        onSuccess: ({ data }) => {
          setFeatureFlags(data.flags);
          setUserData(data);
          setLoadingFlags(false);
        },
        onFailure: (e) => {
          throw new Error('Something unexpected happened retrieving flags');
        }
      }
    );
  }, [requestUser]);

  const isVerifyEmailPath = useLocation().pathname.includes(VERIFY_EMAIL_SUCCESS);

  if (userData) {
    if (!userData.email_verified && !isVerifyEmailPath) {
      return <Redirect to={VERIFY_EMAIL_SUCCESS} />;
    }

    if (userData.email_verified && isVerifyEmailPath) {
      return <Redirect to={CONTENT_SLUG} />;
    }
  }

  const showVerifyScreen = !loadingFlags && isVerifyEmailPath;

  return (
    <UserDataProviderContext.Provider value={{ userData }}>
      <FeatureFlagsProviderContext.Provider value={{ featureFlags }}>
        <PageContextProvider>
          {showVerifyScreen ? (
            <Verify />
          ) : (
            !loadingFlags && (
              <S.Main>
                <S.MainContent>
                  <Dashboard />
                </S.MainContent>
              </S.Main>
            )
          )}
        </PageContextProvider>
      </FeatureFlagsProviderContext.Provider>
    </UserDataProviderContext.Provider>
  );
}

export const useFeatureFlagsProviderContext = () => useContext(FeatureFlagsProviderContext);
export const useUserDataProviderContext = () => useContext(UserDataProviderContext);

export default Main;
