import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const PencilButton = styled.button`
  background: none;
  border: none;
`;

export const PencilIcon = styled(FontAwesomeIcon)`
  color: ${(props) => props.theme.colors.primary};
  font-size: 16px;
  cursor: pointer;

  transition: all 0.1s ease-in-out;

  &:hover {
    transform: translate(-1px, -1px);
  }
  &:active {
    transform: translate(1px, 1px);
  }
`;
