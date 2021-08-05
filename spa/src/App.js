import AdminGlobalStyles from 'styles/AdminGlobalStyles.js';

// Styles
import * as S from './App.styled';
import { ThemeProvider } from 'styled-components';
import { revEngineTheme } from 'styles/themes';
import 'semantic-ui-css/semantic.min.css';
import SvgIcons from 'assets/icons/SvgIcons';

// Deps
import { Provider as AlertProvider } from 'react-alert';
import Alert, { alertOptions } from 'elements/alert/Alert';

// Routing
import MainLayout from 'components/MainLayout';

export const HUB_STRIPE_PUBLISHABLE_KEY = 'pk_test_31XWC5qhlLi9UkV1OzsI634W'; // process.env.REACT_APP_HUB_STRIPE_PUBLISHABLE_KEY

function App() {
  return (
    <ThemeProvider theme={revEngineTheme}>
      <AlertProvider template={Alert} {...alertOptions}>
        <AdminGlobalStyles />
        <SvgIcons />
        <S.App>
          <MainLayout />
        </S.App>
      </AlertProvider>
    </ThemeProvider>
  );
}

export default App;
