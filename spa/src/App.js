import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AdminGlobalStyles from 'styles/AdminGlobalStyles.js';

// Styles
import * as S from './App.styled';
import { ThemeProvider } from 'styled-components';
import { ThemeProvider as MuiThemeProvider } from '@material-ui/core';
import { revEngineTheme, muiThemeOverrides } from 'styles/themes';
import SvgIcons from 'assets/icons/SvgIcons';

// Hooks
import useSentry from 'hooks/useSentry';

// Deps
import Helmet from 'react-helmet';
import { Provider as AlertProvider } from 'react-alert';
import Alert, { alertOptions } from 'elements/alert/Alert';

// Routing
import MainLayout from 'components/MainLayout';

const queryClient = new QueryClient();

function App() {
  useSentry();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={revEngineTheme}>
        <MuiThemeProvider theme={muiThemeOverrides}>
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
        </MuiThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
