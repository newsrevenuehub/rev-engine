import { useState, useContext, createContext, useCallback } from 'react';

import * as S from './Main.styled';

// Utils
import getGlobalPaymentProviderStatus from 'utilities/getGlobalPaymentProviderStatus';

// AJAX
import { LS_USER } from 'settings';

// Children
import Dashboard from 'components/dashboard/Dashboard';

// Analytics
import { useConfigureAnalytics } from './analytics';

const ConnectContext = createContext(null);

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

  return (
    <ConnectContext.Provider
      value={{
        paymentProviderConnectState,
        updateDefaultPaymentProvider,
        checkingProvider,
        setCheckingProvider
      }}
    >
      <S.Main>
        <S.MainContent>
          <Dashboard />
        </S.MainContent>
      </S.Main>
    </ConnectContext.Provider>
  );
}

export const useConnectContext = () => useContext(ConnectContext);

export default Main;
