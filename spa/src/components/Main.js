import { useState, useContext, createContext, useEffect } from 'react';
import { Redirect, useLocation } from 'react-router-dom';

import * as S from './Main.styled';

import { USER } from 'ajax/endpoints';
import Dashboard from 'components/dashboard/Dashboard';
import Verify from 'components/account/Verify';

import useRequest from 'hooks/useRequest';
import { useConfigureAnalytics } from './analytics';
import { CONTENT_SLUG, PROFILE, VERIFY_EMAIL_SUCCESS } from 'routes';
import PageContextProvider from './dashboard/PageContext';
import showProfileScreen from 'components/account/Profile/showProfileScreen';

import { useUserContext } from './UserContext';

const FeatureFlagsProviderContext = createContext(null);

function Main() {
  useConfigureAnalytics();
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [featureFlags, setFeatureFlags] = useState();
  const [user, setUser] = useState();
  const { setUser: setUserContext } = useUserContext();

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
          setUser(data);
          setUserContext(data);
          setLoadingFlags(false);
        },
        onFailure: (e) => {
          throw new Error('Something unexpected happened retrieving flags');
        }
      }
    );
  }, [requestUser]);

  const isVerifyEmailPath = useLocation().pathname.includes(VERIFY_EMAIL_SUCCESS);
  const isProfilePath = useLocation().pathname.includes(PROFILE);

  if (user) {
    if (user.email_verified) {
      if (showProfileScreen(user) && !isProfilePath) {
        return <Redirect to={PROFILE} />;
      } else if (isVerifyEmailPath || (isProfilePath && !showProfileScreen(user))) {
        return <Redirect to={CONTENT_SLUG} />;
      }
    }

    if (!user.email_verified && !isVerifyEmailPath) {
      return <Redirect to={VERIFY_EMAIL_SUCCESS} />;
    }
  }

  const showVerifyScreen = !loadingFlags && isVerifyEmailPath;

  return (
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
  );
}

export const useFeatureFlagsProviderContext = () => useContext(FeatureFlagsProviderContext);

export default Main;
