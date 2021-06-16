import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const CircleButton = styled(motion.button)`
  cursor: pointer;
  border: 2px solid;
  border-color: ${(props) => (props.selected ? props.theme.colors.primary : props.theme.colors.white)};
  border-radius: 50%;
  padding: 1rem;
  box-shadow: ${(props) => props.theme.shadows[1]};
  background: ${(props) => props.theme.colors.paneBackground};

  &:hover {
    transform: translate(-1px, -2px);
    box-shadow: ${(props) => props.theme.shadows[2]};
  }

  &:active {
    transform: translate(1px, 1px);
    box-shadow: ${(props) => props.theme.shadows[1]};
  }

  transition: all 0.1s ease-in-out;
`;

export const Icon = styled(FontAwesomeIcon)``;
