import styled from 'styled-components';

export const Root = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.basePalette.greyscale['30']};
  display: none;
  font-family: ${({ theme }) => theme.systemFont};
  justify-content: space-between;
  margin: 0 20px 12px 20px;
  padding-bottom: 12px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: flex;
  }
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
