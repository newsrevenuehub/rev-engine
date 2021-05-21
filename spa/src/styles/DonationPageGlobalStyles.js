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
    font-family: ${(props) => props.theme.fonts.body};
    box-sizing: border-box;
  }

  p {
    color: ${(props) => props.theme.colors.black};
    font-family: ${(props) => props.theme.fonts.body};
  }

  h1, h2 {
    font-family: ${(props) => props.theme.fonts.heading};
    font-weight: normal;
  }

  h3, h4, h5, h6 {
    color: ${(props) => props.theme.colors.black};
    font-family: ${(props) => props.theme.fonts.subheading};
  }

  h2 {
    color: ${(props) => props.theme.colors.black};
    font-size: 20px;
    font-weight: bold;
  }
`;
