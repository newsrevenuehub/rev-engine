import { withThemes } from '@react-theming/storybook-addon';
import { ThemeProvider as MuiThemeProvider } from '@material-ui/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { Suspense } from 'react';
import { Provider as AlertProvider } from 'react-alert';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { mockDateDecorator } from 'storybook-mock-date-decorator';

import Alert, { alertOptions } from 'elements/alert/Alert';
import { revEngineTheme, muiThemeOverrides } from 'styles/themes';
import AdminGlobalStyles from 'styles/AdminGlobalStyles.js';
import { ReauthContext } from 'components/ReauthContext';

const queryClient = new QueryClient();

// The two MuiThemeProviders here are to force JSS scoping, e.g. so that MUI
// uses classes like MuiButton-5 instead of MuiButton. This helps us catch
// styling mistakes in Storybook as opposed to the app.
const providerFn = ({ children }) => (
  <BrowserRouter>
    <Suspense fallback={<p>Loading...</p>}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={revEngineTheme}>
          <MuiThemeProvider theme={muiThemeOverrides}>
            <MuiThemeProvider>
              <AlertProvider template={Alert} {...alertOptions}>
                <SnackbarProvider anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
                  <AdminGlobalStyles />
                  <ReauthContext.Provider value={{ getReauth: () => {} }}>{children}</ReauthContext.Provider>
                </SnackbarProvider>
              </AlertProvider>
            </MuiThemeProvider>
          </MuiThemeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Suspense>
  </BrowserRouter>
);

export const decorators = [withThemes(null, [revEngineTheme], { providerFn }), mockDateDecorator];

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  backgrounds: {
    values: [
      { name: 'White', value: '#FFFFFF' },
      { name: 'Header color', value: '#523A5E' }
    ]
  },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/
    }
  },
  options: {
    storySort: {
      method: 'alphabetical'
    }
  },
  // this prevents circular reference that breaks storybook on form submission
  // https://github.com/storybookjs/storybook/issues/12747
  docs: { source: { type: 'code' } }
};
