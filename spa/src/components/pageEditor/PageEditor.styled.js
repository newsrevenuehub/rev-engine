import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const PageEditor = styled.div``;

export const ButtonOverlay = styled.div`
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);

  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem 0;
  padding-left: 2rem;
  height: 400px;
`;

export const EditorButton = styled(motion.button)`
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
