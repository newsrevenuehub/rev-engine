import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const PageEditor = styled.div`
  /*
  Adjust to fill space that was padded out by the <Dashboard> container. 96px is
  the width of the buttons on the left side.
  */
  margin-bottom: -2rem;
  margin-left: calc(96px - 3rem);
  margin-top: -3rem;
  width: calc(100% - 8px);
`;

export const PageEditorBackButton = styled.div`
  text-align: center;
  height: 50px;
  width: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const DisabledSaveIcon = styled(FontAwesomeIcon)`
  color: ${(props) => props.theme.colors.grey[0]};
`;

export const ButtonOverlay = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 30px;
  left: 0;
  padding: 30px 0;
  position: fixed;
  top: 48px; /* Height of the top bar */
  width: 96px;
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
