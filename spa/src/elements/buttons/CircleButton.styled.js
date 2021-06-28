import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const CircleButton = styled(motion.button)`
  border-radius: 50%;
  padding: 1rem;

  cursor: ${(props) => (props.disabled ? 'default' : 'pointer')};
  border: ${(props) => (props.disabled ? 'none' : '2px solid')};
  border-color: ${(props) => (props.selected ? props.theme.colors.primary : props.theme.colors.white)};
  box-shadow: ${(props) => (props.disabled ? 'none' : 'props.theme.shadows[1]')};
  background: ${(props) => props.theme.colors.paneBackground};

  ${(props) =>
    !props.disabled &&
    css`
      &:hover {
        transform: translate(-1px, -2px);
        box-shadow: ${(props) => props.theme.shadows[2]};
      }

      &:active {
        transform: translate(1px, 1px);
        box-shadow: ${(props) => props.theme.shadows[1]};
      }

      transition: all 0.1s ease-in-out;
    `}
`;

export const Icon = styled(FontAwesomeIcon)`
  color: ${(props) => {
    if (props.disabled) return props.theme.colors.grey[0];
    switch (props.type) {
      case 'positive':
        return props.theme.colors.success;
      case 'neutral':
        return props.theme.colors.primary;
      case 'caution':
        return props.theme.colors.caution;

      default:
        return props.theme.colors.primary;
    }
  }};
`;
