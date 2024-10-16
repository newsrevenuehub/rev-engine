import { ThemeProvider as MuiThemeProvider } from '@material-ui/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { Provider as AlertProvider } from 'react-alert';
import { BrowserRouter } from 'react-router-dom';
import { mockDateDecorator } from 'storybook-mock-date-decorator';
import { ThemeProvider } from 'styled-components';
import { ReauthContext } from '../src/components/ReauthContext';
import Alert, { alertOptions } from '../src/elements/alert/Alert';
import { muiThemeOverrides, revEngineTheme } from '../src/styles/themes';
import AdminGlobalStyles from '../src/styles/AdminGlobalStyles';
import { SnackbarProvider } from 'notistack';
import '../src/i18n';
import { AnalyticsContextProvider } from '../src/components/analytics/AnalyticsContext';

const queryClient = new QueryClient();

const wrapper = (Story) => (
  <BrowserRouter>
    <Suspense fallback={<p>Loading...</p>}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={revEngineTheme}>
          <MuiThemeProvider theme={muiThemeOverrides}>
            <MuiThemeProvider>
              <AlertProvider template={Alert} {...alertOptions}>
                <SnackbarProvider anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
                  <AdminGlobalStyles />
                  <ReauthContext.Provider value={{ getReauth: () => {} }}>
                    <AnalyticsContextProvider>
                      <Story />
                    </AnalyticsContextProvider>
                  </ReauthContext.Provider>
                </SnackbarProvider>
              </AlertProvider>
            </MuiThemeProvider>
          </MuiThemeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Suspense>
  </BrowserRouter>
);

export const decorators = [wrapper, mockDateDecorator];

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
