import styled from 'styled-components';

export const DraggableListStyles = {
  padding: 0,
  width: '450px',
  margin: '0 auto'
};

export const DraggableListItemStyles = {
  width: '100%',
  listStyle: 'none',
  margin: '16px 0'
};

export const ItemActiveStyles = {
  whileDrag: {
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
