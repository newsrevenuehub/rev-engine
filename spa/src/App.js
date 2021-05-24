import AdminGlobalStyles from 'styles/AdminGlobalStyles.js';

// Styles
import * as S from './App.styled';
import { ThemeProvider } from 'styled-components';
import { adminTheme } from 'styles/themes';
import 'semantic-ui-css/semantic.min.css';
import SvgIcons from 'assets/icons/SvgIcons';

// Deps
import { Provider as AlertProvider } from 'react-alert';
import Alert, { alertOptions } from 'elements/alert/Alert';

// Routing
import MainLayout from 'components/MainLayout';

function App() {
  return (
    <ThemeProvider theme={adminTheme}>
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
