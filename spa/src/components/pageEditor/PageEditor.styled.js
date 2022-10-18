import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const PageEditor = styled.div`
  margin-left: 90px;
`;

export const PageEditorBackButton = styled.div`
  text-align: center;
  height: 50px
  width: 50px`;

export const DisabledSaveIcon = styled(FontAwesomeIcon)`
  color: ${(props) => props.theme.colors.grey[0]};
`;

export const ButtonOverlayOuter = styled.div`
  position: fixed;
  left: 0;
  top: 48px;
  width: 90px;
  background-color: #fff;
  height: 100%;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    padding-top: 0;
    margin-top: 0px;
    height: 100%;
    width: 90px;
    box-shadow: ${(props) => props.theme.shadows[0]};
  }
`;

export const ButtonOverlay = styled.div`
  position: fixed;
  left: 0;
  top: 100px;

  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem 0;
  padding-left: 1.1rem;
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
