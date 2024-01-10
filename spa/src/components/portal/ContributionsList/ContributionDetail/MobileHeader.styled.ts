import { RouterLinkButton } from 'components/base';
import styled from 'styled-components';

export const BackButton = styled(RouterLinkButton)`
  && {
    position: relative;
    left: -10px;
    margin-bottom: 32px;

    .NreButtonLabel {
      color: ${({ theme }) => theme.basePalette.greyscale.black};
    }
  }
`;

export const Root = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.basePalette.greyscale.grey2};
  display: none;
  padding-bottom: 12px;
  margin-bottom: 25px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: block;
  }
`;

export const Heading = styled.div`
  display: flex;
  justify-content: space-between;
  font-family: ${({ theme }) => theme.systemFont};
`;

export const Amount = styled.div`
  font-size: ${({ theme }) => theme.fontSizesUpdated[20]};
  font-weight: 600;
`;

export const PaymentDate = styled.h4`
  font-family: ${({ theme }) => theme.systemFont};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  margin: 0;
`;

export const NextPaymentDate = styled.p`
  font-size: ${({ theme }) => theme.fontSizesUpdated.xs};
  margin: 6px 0 0 0;
`;
