import GlobalStyles from 'styles/createGlobalStyles';

// Styles
import * as S from './App.styled';
import { ThemeProvider } from 'styled-components';
import { baseTheme } from 'styles/themes';

// Deps
import { Provider as AlertProvider } from 'react-alert';
import Alert, { alertOptions } from 'elements/Alert/Alert';

// Routing
import MainRoutes from 'components/MainRoutes';

function App() {
  return (
    <ThemeProvider theme={baseTheme}>
      <AlertProvider template={Alert} {...alertOptions}>
        <GlobalStyles />
        <S.App>
          <MainRoutes />
        </S.App>
      </AlertProvider>
    </ThemeProvider>
  );
}

export default App;
