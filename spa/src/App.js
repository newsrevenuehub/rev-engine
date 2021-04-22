import GlobalStyles from "styles/createGlobalStyles";

// Styles
import * as S from './App.styled';
import { ThemeProvider } from 'styled-components'
import { baseTheme } from 'styles/themes'

function App() {
  return (
    <ThemeProvider theme={baseTheme}>
      <GlobalStyles />
      <S.App>App</S.App>
    </ThemeProvider>
  );
}

export default App;
