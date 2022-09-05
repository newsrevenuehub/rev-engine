import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AdminGlobalStyles from 'styles/AdminGlobalStyles.js';
// Styles
import * as S from './App.styled';
import { ThemeProvider } from 'styled-components';
import { ThemeProvider as MuiThemeProvider } from '@material-ui/core';
import { revEngineTheme, muiThemeOverrides } from 'styles/themes';
import SvgIcons from 'assets/icons/SvgIcons';
import hubFavicon from 'assets/icons/favicon.ico';

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
              <link rel="icon" type="image/png" href={hubFavicon} sizes="64x64 32x32 24x24 16x16" />
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
