import { createGlobalStyle } from 'styled-components';
import { normalize } from 'styled-normalize';

export default createGlobalStyle`
  ${normalize};

  *,
  *::after,
  *::before {
    box-sizing: inherit;
    outline-color: ${(props) => props.theme.colors.primary};
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
    font-weight: normal;
  }

  h3, h4, h5, h6 {
    color: ${(props) => props.theme.colors.black};
    font-family: ${(props) => props.theme.font.heading?.font_name};
  }

  h2 {
    color: ${(props) => props.theme.colors.black};
    font-size: ${(props) => props.theme.fontSizes[2]};
    font-weight: bold;
  }

  input::placeholder {
    color: ${(props) => props.theme.colors.grey[1]};
    font-style: italic;
  }

  a {
    color: #4183c4;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;
