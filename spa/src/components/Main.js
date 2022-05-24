import { useState, useContext, createContext, useCallback, useEffect } from 'react';

import * as S from './Main.styled';

// Utils
import getGlobalPaymentProviderStatus from 'utilities/getGlobalPaymentProviderStatus';

import { LS_USER } from 'settings';
import { USER } from 'ajax/endpoints';
import Dashboard from 'components/dashboard/Dashboard';
import useRequest from 'hooks/useRequest';
import { useConfigureAnalytics } from './analytics';
import GlobalLoading from 'elements/GlobalLoading';

const PaymentProviderContext = createContext(null);
const FeatureFlagsProviderContext = createContext(null);

function Main() {
  // Organization Context management
  const [checkingProvider, setCheckingProvider] = useState(false);
  const [paymentProviderConnectState, setPaymentProviderConnectState] = useState(
    getGlobalPaymentProviderStatus(JSON.parse(localStorage.getItem(LS_USER)))
  );

  const updateDefaultPaymentProvider = useCallback((updatedUser) => {
    setCheckingProvider(true);
    setPaymentProviderConnectState(getGlobalPaymentProviderStatus(updatedUser));
    setCheckingProvider(false);
  }, []);

  useConfigureAnalytics();

  const [loadingFlags, setLoadingFlags] = useState(true);
  const [featureFlags, setFeatureFlags] = useState();

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
        },
        onFailure: (e) => {
          throw new Error('Something unexpected happened retrieving flags');
        }
      }
    );
  }, [requestUser]);

  return (
    <PaymentProviderContext.Provider
      value={{
        paymentProviderConnectState,
        updateDefaultPaymentProvider,
        checkingProvider,
        setCheckingProvider
      }}
    >
      <FeatureFlagsProviderContext.Provider value={{ featureFlags }}>
        {!loadingFlags && (
          <S.Main>
            <S.MainContent>
              <Dashboard />
            </S.MainContent>
          </S.Main>
        )}
      </FeatureFlagsProviderContext.Provider>
    </PaymentProviderContext.Provider>
  );
}

export const usePaymentProviderContext = () => useContext(PaymentProviderContext);
export const useFeatureFlagsProviderContext = () => useContext(FeatureFlagsProviderContext);

export default Main;
