import { useState, useContext, createContext, useCallback, useEffect } from 'react';

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

// Analytics
import { useAnalyticsContext } from './analytics/AnalyticsContext';
import { HUB_GA_V3_ID } from 'constants/analyticsConstants';

const OrganizationContext = createContext(null);

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

  const { setAnalyticsConfig } = useAnalyticsContext();

  useEffect(() => {
    setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID });
  }, []);

  return (
    <OrganizationContext.Provider
      value={{
        paymentProviderConnectState,
        updateDefaultPaymentProvider,
        checkingProvider,
        setCheckingProvider
      }}
    >
      <S.Main>
        <S.MainContent>
          <Switch>
            <Route path={MAIN_CONTENT_SLUG}>
              <Dashboard />
            </Route>
          </Switch>
        </S.MainContent>
      </S.Main>
    </OrganizationContext.Provider>
  );
}

export const useOrganizationContext = () => useContext(OrganizationContext);

export default Main;
