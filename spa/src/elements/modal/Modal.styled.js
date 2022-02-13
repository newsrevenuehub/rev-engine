import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const Underlay = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  height: 100%;
  width: 100%;
  z-index: 1001;
  background: rgba(0, 0, 0, 0.5);
`;

export const Modal = styled.div`
  background: ${(props) => props.theme.colors.white};
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1002;
  min-width: 400px;
  min-height: 300px;
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;

  svg {
    width: 15px;
    height: 15px;
    fill: black;
  }
`;

export const CloseIcon = styled(FontAwesomeIcon)`
  width: 15px;
  height: 15px;
  fill: ${(props) => props.theme.colors.black};
`;
