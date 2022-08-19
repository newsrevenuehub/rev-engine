import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

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

// react query client that is accessible via context because used in provider
// below.
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
      {/* this only gets rendered when process.env.NODE_ENV === 'development'. See here */}
      {/* https://tanstack.com/query/v4/docs/devtools#install-and-import-the-devtools */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
