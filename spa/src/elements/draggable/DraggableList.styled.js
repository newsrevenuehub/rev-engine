import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const DraggableListStyles = {
  padding: 0,
  width: '90%',
  margin: '0 auto'
};

export const DraggableListItemStyles = {
  width: '100%',
  listStyle: 'none',
  margin: '2rem 0'
};

export const ItemActiveStyles = {
  whileHover: {
    scale: 1.03
  }
};

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
