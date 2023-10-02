import { Button } from 'components/base';
import styled from 'styled-components';

export const Root = styled.div`
  display: grid;
  gap: 20px;
  padding: 30px 65px;
  width: 570px;

  > div {
    /* This targets <ConnectStripeNeedHelpCTA>. */
    margin: 0;
  }
`;

export const Description = styled.p`
  font-weight: 300;
  margin: 0;
`;

export const Heading = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin: 0;
`;

export const LaterButton = styled(Button)`
  && {
    text-transform: none;

    & .NreButtonLabel {
      color: ${({ theme }) => theme.basePalette.secondary.hyperlink};
      font-weight: 500;

      /* Styles copied from Link. */

      &:active {
        color: #0042a3;
      }

      &:hover {
        color: #0a6dff;
      }
    }
  }
`;
