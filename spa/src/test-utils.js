import * as rtl from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Theme/Styles
import { revEngineTheme } from 'styles/themes';
import GlobalStyle from 'styles/AdminGlobalStyles';
import { ThemeProvider } from 'styled-components';

// Alert provider
import { Provider as AlertProvider } from 'react-alert';
import Alert, { alertOptions } from 'elements/alert/Alert';

import { LS_USER, LS_AVAILABLE_ORGS, LS_AVAILABLE_RPS } from 'settings';

// LS mock
import { LocalStorageMock } from '@react-mock/localstorage';

// Context
import { AnalyticsContextWrapper } from './components/analytics/AnalyticsContext';

// Routing
import { BrowserRouter } from 'react-router-dom';

// Fixtures
import superuser from '../cypress/fixtures/user/super-user.json';
import hubAdmin from '../cypress/fixtures/user/hub-admin.json';
import orgAdmin from '../cypress/fixtures/user/org-admin.json';
import rpAdmin from '../cypress/fixtures/user/rp-admin.json';

function TestProviders({ children }) {
  return (
    <ThemeProvider theme={revEngineTheme}>
      <AlertProvider template={Alert} {...alertOptions}>
        <BrowserRouter>
          <GlobalStyle />
          <AnalyticsContextWrapper>{children}</AnalyticsContextWrapper>
        </BrowserRouter>
      </AlertProvider>
    </ThemeProvider>
  );
}

const customRender = (ui, options) => {
  return rtl.render(ui, {
    wrapper: (props) => <TestProviders {...props} {...options?.TestProviderProps} />,
    ...options?.testingLibraryOptions
  });
};

const renderWithLocalStorage = (ui, { localStorage = {}, ...options } = {}) => {
  return rtl.render(ui, {
    wrapper: (props) => (
      <LocalStorageMock items={localStorage}>
        <TestProviders {...props} {...options?.TestProviderProps} />
      </LocalStorageMock>
    ),
    ...options?.testingLibraryOptions
  });
};

function getUserForRole(userRole) {
  switch (userRole) {
    case 'superuser':
      return superuser.user;
    case 'hub_admin':
      return hubAdmin.user;
    case 'org_admin':
      return orgAdmin.user;
    case 'rp_admin':
      return rpAdmin.user;
    default:
      return superuser.user;
  }
}

/**
 *
 * @param {('superuser'|'hub_adin'|'org_admin'|'rp_admin')} userRole - If provided, use a fixture for a user with this role.
 * @param {Object} user - If provided, use this specific user fixture.
 * @returns {Object} Returns object that can be used to set localStorage values necessary to indicate a valid, authenticated user.
 */
function getUserLSValues(userRole, userFixture) {
  let lsUser = userFixture?.user;
  if (!lsUser) lsUser = getUserForRole(userRole);
  const { id, organizations, revenue_programs } = lsUser;
  return {
    [LS_USER]: JSON.stringify(lsUser),
    [`${id}__${LS_AVAILABLE_ORGS}`]: JSON.stringify(organizations),
    [`${id}__${LS_AVAILABLE_RPS}`]: JSON.stringify(revenue_programs)
  };
}

const renderWithUser = (ui, { userFixture, userRole, ...options } = {}) =>
  renderWithLocalStorage(ui, {
    localStorage: { ...getUserLSValues(userRole, userFixture), ...options.localStorage },
    ...options
  });

module.exports = {
  ...rtl,
  render: customRender,
  renderWithLocalStorage,
  renderWithUser,
  userEvent
};
