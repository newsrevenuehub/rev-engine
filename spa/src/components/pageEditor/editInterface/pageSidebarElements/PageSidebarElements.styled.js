import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const PageSidebarElements = styled.div``;

export const AddElementButton = styled.button`
  position: absolute;
  bottom: 20px;
  right: 20px;
  border: 2px solid ${(props) => props.theme.colors.primary};
  width: 48px;
  height: 48px;
  cursor: pointer;
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

export const AddElementIcon = styled(FontAwesomeIcon)`
  color: ${(props) => props.theme.colors.primary};
`;
