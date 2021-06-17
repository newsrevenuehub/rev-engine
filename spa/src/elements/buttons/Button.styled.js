import styled, { css } from 'styled-components';

export const Button = styled.button`
  display: block;
  text-align: center;
  border: 1px solid;

  opacity: ${(props) => (props.disabled ? 0.4 : 1)};
  cursor: ${(props) => (props.disabled ? 'default' : 'pointer')};

  border-radius: ${(props) => props.theme.radii[1]};
  width: 100%;
  min-height: 48px;
  line-height: 48px;

  padding: 0 1rem;
  position: relative;
  font-size: ${(props) => props.theme.fontSizes[1]};
  font-weight: 700;

  ${(props) => {
    if (props.type === 'neutral') {
      return css`
        background: ${(props) => props.theme.colors.white};
        border-color: ${(props) => props.theme.colors.primary};
        color: ${(props) => props.theme.colors.primary};
      `;
    } else {
      return css`
        background: ${(props) => props.theme.colors.primary};
        border-color: ${(props) => props.theme.colors.primary};
        color: ${(props) => props.theme.colors.white};
      `;
    }
  }};
`;
