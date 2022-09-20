import * as rtl from '@testing-library/react';

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

export * from '@testing-library/react';
export * as user from '@testing-library/user-event';

function TestProviders({ children }: { children?: React.ReactNode }) {
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

export const render = (ui: React.ReactElement, options?: Omit<rtl.RenderOptions, 'wrapper'>) => {
  return rtl.render(ui, {
    wrapper: (props) => <TestProviders {...props} {...options} />
  });
};
