import { useState, useContext, createContext, useEffect } from 'react';

import * as S from './Main.styled';

import { USER } from 'ajax/endpoints';
import Dashboard from 'components/dashboard/Dashboard';
import useRequest from 'hooks/useRequest';
import { useConfigureAnalytics } from './analytics';

const UserProviderContext = createContext(null);

function Main() {
  useConfigureAnalytics();

  const [loadingFlags, setLoadingFlags] = useState(true);
  const [user, setUser] = useState();

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
          setUser(data);
          setLoadingFlags(false);
        },
        onFailure: (e) => {
          console.log('an errrooor');
          throw new Error('Something unexpected happened retrieving flags');
        }
      }
    );
  }, [requestUser]);

  return (
    <UserProviderContext.Provider value={{ user }}>
      {!loadingFlags && (
        <S.Main>
          <S.MainContent>
            <Dashboard />
          </S.MainContent>
        </S.Main>
      )}
    </UserProviderContext.Provider>
  );
}

export const useUserProviderContext = () => useContext(UserProviderContext);

export default Main;
