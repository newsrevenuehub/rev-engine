import styled from 'styled-components';
import { Button, CircularProgress } from 'components/base';

export const SubmitButton = styled(Button)`
  && {
    background: ${({ theme }) => theme.colors.cstm_CTAs ?? theme.colors.primary};
    margin-top: 3rem;
    text-transform: none;

    &:active,
    &:hover {
      background: ${({ theme }) => theme.colors.cstm_CTAs ?? theme.colors.primary};
    }

    &.Mui-disabled {
      opacity: 0.4;
    }

    .NreButtonLabel {
      font-size: 16px;
    }
  }
`;

export const Spinner = styled(CircularProgress)`
  && .NreCircle {
    color: ${({ theme }) => theme.basePalette.greyscale.white};
  }
`;
