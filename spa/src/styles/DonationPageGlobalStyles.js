import { createGlobalStyle } from 'styled-components';
import { normalize } from 'styled-normalize';

export default createGlobalStyle`
  ${normalize};

  *,
  *::after,
  *::before {
    box-sizing: inherit;
  }

  body {
    color: ${(props) => props.theme.colors.black};
    font-family: ${(props) => props.theme.font.body?.font_name};
    box-sizing: border-box;
  }

  p {
    color: ${(props) => props.theme.colors.black};
    font-family: ${(props) => props.theme.font.body?.font_name};
  }

  h1, h2 {
    font-family: ${(props) => props.theme.font.heading?.font_name};
    font-weight: bold;
  }

  h3, h4, h5, h6 {
    color: ${(props) => props.theme.colors.black};
    font-family: ${(props) => props.theme.font.heading?.font_name};
  }

  h2 {
    color: ${(props) => props.theme.colors.black};
    font-size: ${(props) => props.theme.fontSizes[3]};
  }
`;
