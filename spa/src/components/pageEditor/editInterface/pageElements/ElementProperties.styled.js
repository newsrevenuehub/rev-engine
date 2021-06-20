import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const ElementProperties = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

export const ElementHeading = styled.div`
  position: relative;
  text-align: center;
  padding: 1rem;

  h5 {
    margin: 1rem;
  }
`;

export const ElementEditor = styled.div``;

export const Buttons = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding-top: 1rem;
  margin-bottom: 2rem;

  & button:not(:last-child) {
    margin-right: 2rem;
  }
`;

export const DeleteButton = styled.button`
  position: absolute;
  right: 15px;
  top: 50%;
  cursor: pointer;
  border: none;
  background: transparent;
`;

export const TrashIcon = styled(FontAwesomeIcon)`
  transform: translateY(-50%);
  color: ${(props) => props.theme.colors.caution};

  transition: all 0.2s ease-in-out;

  &:hover {
    opacity: 0.7;
  }
`;
