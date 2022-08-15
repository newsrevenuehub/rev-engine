import { useState, useContext, createContext, useEffect } from 'react';

import * as S from './Main.styled';

import { USER } from 'ajax/endpoints';
import Dashboard from 'components/dashboard/Dashboard';
import useRequest from 'hooks/useRequest';
import { useConfigureAnalytics } from './analytics';

const FeatureFlagsProviderContext = createContext(null);

function Main() {
  useConfigureAnalytics();

  const [loadingFlags, setLoadingFlags] = useState(true);
  const [featureFlags, setFeatureFlags] = useState();
  const [userDetails, setUserDetails] = useState();

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
          setLoadingFlags(false);
          setUserDetails(data);
        },
        onFailure: (e) => {
          throw new Error('Something unexpected happened retrieving flags');
        }
      }
    );
  }, [requestUser]);

  return (
    <FeatureFlagsProviderContext.Provider value={{ featureFlags, userDetails }}>
      {!loadingFlags && (
        <S.Main>
          <S.MainContent>
            <Dashboard />
          </S.MainContent>
        </S.Main>
      )}
    </FeatureFlagsProviderContext.Provider>
  );
}

export const useFeatureFlagsProviderContext = () => useContext(FeatureFlagsProviderContext);

export default Main;
