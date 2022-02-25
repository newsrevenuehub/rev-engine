import AdminGlobalStyles from 'styles/AdminGlobalStyles.js';

// Styles
import { ThemeProvider } from 'styled-components';
import { ThemeProvider as MuiThemeProvider } from '@material-ui/core';
import { revEngineTheme, muiThemeOverrides } from 'styles/themes';
import 'semantic-ui-css/semantic.min.css';
import SvgIcons from 'assets/icons/SvgIcons';
import hubFavicon from 'assets/icons/favicon.ico';

// Hooks
import useSentry from 'hooks/useSentry';

// Deps
import Helmet from 'react-helmet';
import { Provider as AlertProvider } from 'react-alert';
import Alert, { alertOptions } from 'elements/alert/Alert';

// Routing
import Main from 'components/Main';

function App() {
  useSentry();

  return (
    <ThemeProvider theme={revEngineTheme}>
      <MuiThemeProvider theme={muiThemeOverrides}>
        <AlertProvider template={Alert} {...alertOptions}>
          <Helmet>
            <link rel="icon" type="image/png" href={hubFavicon} sizes="64x64 32x32 24x24 16x16" />
          </Helmet>
          <AdminGlobalStyles />
          <SvgIcons />
          <Main />
        </AlertProvider>
      </MuiThemeProvider>
    </ThemeProvider>
  );
}

export default App;
