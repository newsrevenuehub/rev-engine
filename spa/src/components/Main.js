import { useState, useContext, createContext, useEffect } from 'react';
import { Redirect, useLocation } from 'react-router-dom';

import * as S from './Main.styled';

import { USER } from 'ajax/endpoints';
import Dashboard from 'components/dashboard/Dashboard';
import Verify from 'components/account/Verify/Verify';

import useRequest from 'hooks/useRequest';
import { useConfigureAnalytics } from './analytics';
import * as ROUTES from 'routes';

const FeatureFlagsProviderContext = createContext(null);
const UserDataProviderContext = createContext(null);

function Main() {
  useConfigureAnalytics();

  const [loadingFlags, setLoadingFlags] = useState(true);
  const [featureFlags, setFeatureFlags] = useState();
  const [userData, setUserData] = useState();

  const requestUser = useRequest();

  const isVerifyEmail = useLocation().pathname.includes(ROUTES.VERIFY_EMAIL_SUCCESS);
  const isAPIPath = useLocation().pathname.includes('/api/');

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
          setLoadingFlags(false);
          setUserData(data);
        },
        onFailure: (e) => {
          throw new Error('Something unexpected happened retrieving flags');
        }
      }
    );
  }, [requestUser]);

  if (userData && !userData.email_verified && !userData.role_type && !isVerifyEmail && !isAPIPath) {
    return <Redirect to={ROUTES.VERIFY_EMAIL_SUCCESS} />;
  }

  return (
    <UserDataProviderContext.Provider value={{ userData }}>
      <FeatureFlagsProviderContext.Provider value={{ featureFlags }}>
        {isVerifyEmail && <Verify />}
        {!loadingFlags && userData.email_verified && !isVerifyEmail && (
          <S.Main>
            <S.MainContent>
              <Dashboard />
            </S.MainContent>
          </S.Main>
        )}
      </FeatureFlagsProviderContext.Provider>
    </UserDataProviderContext.Provider>
  );
}

export const useFeatureFlagsProviderContext = () => useContext(FeatureFlagsProviderContext);
export const useUserDataProviderContext = () => useContext(UserDataProviderContext);

export default Main;
