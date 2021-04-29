import GlobalStyles from "styles/createGlobalStyles";

// Styles
import * as S from './App.styled';
import { ThemeProvider } from 'styled-components'
import { baseTheme } from 'styles/themes'

// Routing
import MainRoutes from 'components/MainRoutes';

function App() {
  return (
    <ThemeProvider theme={baseTheme}>
      <GlobalStyles />
      <S.App>
        <MainRoutes />
      </S.App>
    </ThemeProvider>
  );
}

export default App;
