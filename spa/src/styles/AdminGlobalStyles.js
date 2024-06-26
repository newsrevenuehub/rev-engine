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
    font-family: ${(props) => props.theme.systemFont};
    box-sizing: border-box;
  }

  p {
    color: ${(props) => props.theme.colors.black};
    font-family: ${(props) => props.theme.systemFont};
  }

  h1, h2 {
    font-family: ${(props) => props.theme.systemFont};
    font-weight: normal;
  }

  h3, h4, h5, h6 {
    color: ${(props) => props.theme.colors.black};
    font-family: ${(props) => props.theme.systemFont};
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
