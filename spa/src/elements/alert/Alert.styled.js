import styled, { css } from 'styled-components';

export const Alert = styled.div`
  position: relative;
  font-size: ${(props) => props.theme.fontSizes[1]};
  color: ${(props) => props.theme.colors.white};
  min-width: 300px;
  max-width: 400px;
  padding: 2rem;
  border-radius: ${(props) => props.theme.radii[0]};

  ${(props) => {
    if (props.type === 'info') {
      return css`
        background: ${props.theme.colors.info};
      `;
    }
    if (props.type === 'success') {
      return css`
        background: ${props.theme.colors.success};
      `;
    }
    if (props.type === 'error') {
      return css`
        background: ${props.theme.colors.warning};
      `;
    }
  }}
`;

export const Close = styled.button`
  color: ${(props) => props.theme.colors.white};
  cursor: pointer;
  padding: 0.5rem;
  font-size: ${(props) => props.theme.fontSizes[1]};
  border: none;
  background: none;
  position: absolute;
  right: 0;
  top: 0;
`;
