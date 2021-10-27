import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const ElementProperties = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: hidden; ;
`;

export const ElementHeading = styled.div`
  position: relative;
  text-align: center;
  padding: 1rem 0;
  border-bottom: 1px solid ${(props) => props.theme.colors.grey[1]};

  h5 {
    margin: 1rem;
  }
`;

export const ElementEditor = styled.div`
  flex: 1;
  overflow-y: auto;
`;

export const ButtonsSection = styled.div`
  border-top: 1px solid ${(props) => props.theme.colors.grey[1]};
`;

export const Buttons = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 1rem 0;

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
