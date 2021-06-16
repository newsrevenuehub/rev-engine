import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const PageItem = styled.div`
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  border: 2px solid;
  border-color: ${(props) => (props.disabled ? props.theme.colors.disabled : props.theme.colors.primary)};
  border-radius: ${(props) => props.theme.radii[0]};
  height: 100%;
  background: ${(props) => props.theme.colors.paneBackground};
  display: flex;
  flex-direction: row;
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
`;

export const ItemIconWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
`;

export const ItemIcon = styled(FontAwesomeIcon)`
  color: ${(props) => (props.disabled ? props.theme.colors.disabled : props.theme.colors.primary)};
  font-size: 20px;
`;

export const ItemContentWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
`;

export const ItemName = styled.h5`
  margin: 0 0 0.5rem 0;
`;

export const ItemDescription = styled.p``;

export const TrashIcon = styled(FontAwesomeIcon)`
  color: ${(props) => props.theme.colors.caution};
  opacity: 0.5;
  font-size: 20px;
`;
