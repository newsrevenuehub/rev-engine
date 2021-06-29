import { useState, useContext, createContext, useCallback } from 'react';

import * as S from './Main.styled';

// Routing
import { Switch, Route } from 'react-router-dom';

// Utils
import getGlobalPaymentProviderStatus from 'utilities/getGlobalPaymentProviderStatus';

// Slugs
import { MAIN_CONTENT_SLUG } from 'routes';

// AJAX
import { LS_USER } from 'constants/authConstants';

// Children
import Dashboard from 'components/dashboard/Dashboard';

const OrganizationContext = createContext(null);

function Main() {
  // Organization Context management
  const [checkingProvider, setCheckingProvider] = useState(false);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem(LS_USER)));
  const [paymentProviderConnectState, setPaymentProviderConnectState] = useState(getGlobalPaymentProviderStatus(user));

  const updateDefaultPaymentProvider = useCallback((updatedUser) => {
    setCheckingProvider(true);
    setPaymentProviderConnectState(getGlobalPaymentProviderStatus(updatedUser));
    setCheckingProvider(false);
  }, []);

  return (
    <OrganizationContext.Provider
      value={{
        user,
        setUser,
        paymentProviderConnectState,
        updateDefaultPaymentProvider,
        checkingProvider,
        setCheckingProvider
      }}
    >
      <>
        <S.Main>
          <S.MainContent>
            <Switch>
              <Route path={MAIN_CONTENT_SLUG}>
                <Dashboard />
              </Route>
            </Switch>
          </S.MainContent>
        </S.Main>
      </>
    </OrganizationContext.Provider>
  );
}

export const useOrganizationContext = () => useContext(OrganizationContext);

export default Main;
