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
import needsProfileFinalization from 'utilities/needsProfileFinalization';

import { useUserContext } from './UserContext';

const FeatureFlagsProviderContext = createContext(null);

function Main() {
  useConfigureAnalytics();
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [featureFlags, setFeatureFlags] = useState();
  const { setUser: setUserContext, user } = useUserContext();

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
          setUserContext(data);
          setLoadingFlags(false);
        },
        onFailure: (e) => {
          throw new Error('Something unexpected happened retrieving flags');
        }
      }
    );
  }, [requestUser, setUserContext]);

  // Short-circuit normal routing for email verification and profile
  // finalization.

  const isVerifyEmailPath = useLocation().pathname.includes(VERIFY_EMAIL_SUCCESS);
  const isProfilePath = useLocation().pathname.includes(PROFILE);

  if (user) {
    if (user.email_verified) {
      if (needsProfileFinalization(user) && !isProfilePath) {
        // If the user hasn't finished setting up their profile, force them to
        // do so.

        return <Redirect to={PROFILE} />;
      } else if (isVerifyEmailPath || (isProfilePath && !needsProfileFinalization(user))) {
        // If the user is on a route they don't need anymore (they've verified
        // their email already but are still on the email verification route),
        // send them to the default route.

        return <Redirect to={CONTENT_SLUG} />;
      }
    } else if (!isVerifyEmailPath) {
      // If the user hasn't verified their email yet, force them to do so.

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
