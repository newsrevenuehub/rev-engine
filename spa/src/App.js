import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CookiesProvider } from 'react-cookie';

import AdminGlobalStyles from 'styles/AdminGlobalStyles.js';

// Styles
import * as S from './App.styled';
import { ThemeProvider } from 'styled-components';
import { ThemeProvider as MuiThemeProvider } from '@material-ui/core';
import { revEngineTheme, muiThemeOverrides } from 'styles/themes';
import SvgIcons from 'assets/icons/SvgIcons';

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
              <AlertProvider template={Alert} {...alertOptions}>
                <Helmet>
                  <title>RevEngine</title>
                </Helmet>
                <AdminGlobalStyles />
                <SvgIcons />
                <S.App>
                  <MainLayout />
                </S.App>
              </AlertProvider>
            </BrowserRouter>
          </MuiThemeProvider>
        </ThemeProvider>
      </CookiesProvider>
    </QueryClientProvider>
  );
}

export default App;
