import * as rtl from '@testing-library/react';
import user from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Theme/Styles
import { revEngineTheme } from 'styles/themes';
import GlobalStyle from 'styles/AdminGlobalStyles';
import { ThemeProvider } from 'styled-components';

// Alert provider
import { Provider as AlertProvider } from 'react-alert';
import Alert, { alertOptions } from 'elements/alert/Alert';

// Context
import { AnalyticsContextWrapper } from './components/analytics/AnalyticsContext';

// Routing
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient();

function TestProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={revEngineTheme}>
        <AlertProvider template={Alert} {...alertOptions}>
          <BrowserRouter>
            <GlobalStyle />
            <AnalyticsContextWrapper>{children}</AnalyticsContextWrapper>
          </BrowserRouter>
        </AlertProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const customRender = (ui, options) => {
  return rtl.render(ui, {
    wrapper: (props) => <TestProviders {...props} {...options?.TestProviderProps} />,
    ...options?.testingLibraryOptions
  });
};

module.exports = {
  ...rtl,
  render: customRender,
  user
};
