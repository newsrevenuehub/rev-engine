import styled, { css } from 'styled-components';

export const Alert = styled.div`
  position: relative;
  font-size: 18px;
  color: ${(p) => p.theme.colors.white};
  min-width: 300px;
  max-width: 400px;
  padding: 2rem;
  border-radius: ${(p) => p.theme.radii[0]};

  ${(p) => {
    if (p.type === 'info') {
      return css`
        background: ${p.theme.colors.info};
      `;
    }
    if (p.type === 'success') {
      return css`
        background: ${p.theme.colors.success};
      `;
    }
    if (p.type === 'error') {
      return css`
        background: ${p.theme.colors.warning};
      `;
    }
  }}
`;

export const Close = styled.button`
  color: ${(p) => p.theme.colors.white};
  cursor: pointer;
  padding: 0.5rem;
  font-size: 18px;
  border: none;
  background: none;
  position: absolute;
  right: 0;
  top: 0;
`;
