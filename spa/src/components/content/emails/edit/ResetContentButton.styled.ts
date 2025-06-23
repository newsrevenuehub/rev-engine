import { Button as BaseButton } from 'components/base';
import styled from 'styled-components';

export const Button = styled(BaseButton)`
  &&,
  &&:hover {
    background: none;
    border: none;
    box-shadow: none;
    margin-left: -15px;
    text-transform: none;
    width: fit-content;

    & .NreButtonLabel {
      color: ${({ theme }) => theme.basePalette.primary.engineBlue};
    }

    &.Mui-disabled {
      background: none;
    }
  }
`;
