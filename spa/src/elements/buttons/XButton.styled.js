import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const XButton = styled.button`
  background: none;
  border: none;
`;

export const XIcon = styled(FontAwesomeIcon)`
  color: ${(props) => {
    if (props.disabled) return props.theme.colors.grey[0];
    switch (props.type) {
      case 'positive':
        return props.theme.colors.success;
      case 'neutral':
        return props.theme.colors.primary;
      case 'caution':
        return props.theme.colors.caution;

      default:
        return props.theme.colors.primary;
    }
  }};

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
