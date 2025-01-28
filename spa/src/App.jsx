import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CookiesProvider } from 'react-cookie';

import AdminGlobalStyles from 'styles/AdminGlobalStyles.js';
import { SnackbarProvider } from 'notistack';

// Styles
import { AppWrapper } from './App.styled';
import { ThemeProvider } from 'styled-components';
import { ThemeProvider as MuiThemeProvider } from '@material-ui/core';
import { revEngineTheme, muiThemeOverrides } from 'styles/themes';

// Deps
import Helmet from 'react-helmet';
import { Provider as AlertProvider } from 'react-alert';
import Alert, { alertOptions } from 'elements/alert/Alert';

// Routing
import MainLayout from 'components/MainLayout';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CookiesProvider>
        <ThemeProvider theme={revEngineTheme}>
          <MuiThemeProvider theme={muiThemeOverrides}>
            <BrowserRouter>
              <SnackbarProvider anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
                <AlertProvider template={Alert} {...alertOptions}>
                  <Helmet>
                    <title>RevEngine</title>
                  </Helmet>
                  <AdminGlobalStyles />
                  <AppWrapper>
                    <MainLayout />
                  </AppWrapper>
                </AlertProvider>
              </SnackbarProvider>
            </BrowserRouter>
          </MuiThemeProvider>
        </ThemeProvider>
      </CookiesProvider>
    </QueryClientProvider>
  );
}

export default App;
