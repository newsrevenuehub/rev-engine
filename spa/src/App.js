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
import Main from 'components/Main';

function App() {
  return (
    <ThemeProvider theme={adminTheme}>
      <AlertProvider template={Alert} {...alertOptions}>
        <AdminGlobalStyles />
        <SvgIcons />
        <S.App>
          <Main />
        </S.App>
      </AlertProvider>
    </ThemeProvider>
  );
}

export default App;
