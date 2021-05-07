import { createGlobalStyle } from 'styled-components';
import { normalize } from 'styled-normalize';

export default createGlobalStyle`
  ${normalize};

  *,
  *::after,
  *::before {
      box-sizing: inherit;
      outline-color: ${(p) => p.theme.colors.primary};
  }

  body {
    color: ${(p) => p.theme.colors.black};
    font-family: ${(p) => p.theme.fonts.body};
    box-sizing: border-box;
  }

  p {
    color: ${(p) => p.theme.colors.black};
    font-family: ${(p) => p.theme.fonts.body};
  }

  h1, h2 {
    color: ${(p) => p.theme.colors.black};
    font-family: ${(p) => p.theme.fonts.heading};
    font-weight: normal;
  }

  h3, h4, h5, h6 {
    color: ${(p) => p.theme.colors.black};
    font-family: ${(p) => p.theme.fonts.subheading};
  }


`;
