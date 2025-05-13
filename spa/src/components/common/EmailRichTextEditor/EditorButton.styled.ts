import styled from 'styled-components';
import { Button as BaseButton } from 'components/base';

export const Button = styled(BaseButton)<{ $active?: boolean }>`
  &&& {
    ${(props) => props.$active && 'background-color: #2828280F;'}
    height: 40px; /* to match select */
    min-width: 40px;
    padding: 0;

    .NreButtonLabel {
      padding: 0;
    }
  }
`;
