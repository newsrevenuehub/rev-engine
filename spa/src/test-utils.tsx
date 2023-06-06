import * as rtl from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Theme/Styles
import { revEngineTheme } from 'styles/themes';
import GlobalStyle from 'styles/AdminGlobalStyles';
import { ThemeProvider } from 'styled-components';

// Alert provider
import { Provider as AlertProvider } from 'react-alert';
import Alert, { alertOptions } from 'elements/alert/Alert';

// Context
import { AnalyticsContextProvider } from './components/analytics/AnalyticsContext';

// Routing
import { BrowserRouter } from 'react-router-dom';
import { ReactChild } from 'react';

export * from '@testing-library/react';
export * as user from '@testing-library/user-event';

const queryClient = new QueryClient();

function TestProviders({ children }: { children?: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={revEngineTheme}>
        <AlertProvider template={Alert} {...alertOptions}>
          <BrowserRouter>
            <GlobalStyle />
            <AnalyticsContextProvider>{children}</AnalyticsContextProvider>
          </BrowserRouter>
        </AlertProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * A wrapper component for testing hooks that use react-query. This creates a
 * new query client for each usage--e.g. avoids caching results from a previous
 * test--that also instantly fails if fetching fails instead of retrying, and
 * retries instantly if a query has overriden this logic.
 */
export function TestQueryClientProvider({ children }: { children: ReactChild }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: {
              retry: false,
              retryDelay: 0
            }
          }
        })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

// Converts form data to objects for easier assertions.

export function formDataToObject(data: FormData): Record<string, any> {
  return Array.from(data.entries()).reduce((result, [key, value]) => ({ ...result, [key]: value }), {});
}

export const render = (ui: React.ReactElement, options?: Omit<rtl.RenderOptions, 'wrapper'>) => {
  return rtl.render(ui, {
    wrapper: (props) => <TestProviders {...props} {...options} />
  });
};
