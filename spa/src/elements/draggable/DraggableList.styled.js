import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const DraggableList = styled.ul`
  padding: 0;
  width: 90%;
  margin: 0 auto;
  list-style: none;
`;

export const DraggableListItem = styled.li`
  width: 100%;
`;

export const PanelItemDeleteButton = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  border: none;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
  padding: 0;
  width: 40px;
  cursor: pointer;

  &:active {
    background: red;
  }

  & svg {
    color: grey;
  }

  &:active svg {
    color: white;
  }
`;

export const TrashIcon = styled(FontAwesomeIcon)`
  color: red;
`;
