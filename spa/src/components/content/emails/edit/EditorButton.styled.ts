import styled from 'styled-components';
import { Button as BaseButton } from 'components/base';

export const Button = styled(BaseButton)<{ $active?: boolean }>`
  &&& {
    border: 1px solid ${({ theme }) => theme.basePalette.greyscale[70]};
    min-width: 40px;
    padding: 0;

    &[aria-pressed='true'] {
      background-color: ${({ theme }) => theme.basePalette.greyscale[30]};

      & .NreButtonLabel {
        color: black;
      }
    }

    .NreButtonLabel {
      padding: 0;
    }
  }
`;
