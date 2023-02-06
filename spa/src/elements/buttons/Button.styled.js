import styled, { css } from 'styled-components';
import lighten from 'styles/utils/lighten';

function getBg(props) {
  return props.theme.colors?.cstm_CTAs || props.theme.colors?.primary;
}

export const Button = styled.button`
  display: block;
  text-align: center;
  border: 2px solid;

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
        &:hover {
          border-color: ${(props) => lighten(props.theme.colors.primary)};
          color: ${(props) => lighten(props.theme.colors.primary)};
        }
      `;
    } else if (props.type === 'positive') {
      return css`
        background: ${(props) => props.theme.colors.white};
        border-color: ${(props) => props.theme.colors.success};
        color: ${(props) => props.theme.colors.success};
        &:hover {
          border-color: ${(props) => lighten(props.theme.colors.success)};
          color: ${(props) => lighten(props.theme.colors.success)};
        }
      `;
    } else if (props.type === 'caution') {
      return css`
        background: ${(props) => props.theme.colors.white};
        border-color: ${(props) => props.theme.colors.caution};
        color: ${(props) => props.theme.colors.caution};
        &:hover {
          border-color: ${(props) => lighten(props.theme.colors.caution)};
          color: ${(props) => lighten(props.theme.colors.caution)};
        }
      `;
    } else {
      return css`
        background: ${(props) => getBg(props)};
        border-color: ${(props) => getBg(props)};
        color: ${(props) => props.theme.colors.white};
        &:hover {
          border-color: ${(props) => lighten(getBg(props))};
          color: ${(props) => lighten(props.theme.colors.white)};
        }
      `;
    }
  }};
`;
