import { Button } from 'components/base';
import styled from 'styled-components';

export const EditButton = styled(Button)`
  && {
    background: none;
    box-shadow: none;
    margin-top: 20px;
    padding: 0;
    text-transform: none;

    .NreButtonLabel {
      color: ${({ theme }) => theme.basePalette.secondary.hyperlink};
      font-size: 18px;
      font-weight: 500;
      text-decoration: underline;
    }

    &:hover,
    &:disabled {
      background: none;
      box-shadow: none;
    }

    &:disabled .NreButtonLabel {
      text-decoration: none;
    }
  }
`;

export const LastCardDigits = styled.span`
  color: ${({ theme }) => theme.basePalette.greyscale.grey1};

  &::before {
    /* Leading dots */
    content: '\\2022\\2022\\2022\\00a0';
  }
`;
