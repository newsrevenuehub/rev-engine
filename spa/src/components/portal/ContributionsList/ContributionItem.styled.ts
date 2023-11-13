import { PaymentStatus } from 'constants/paymentStatus';
import styled from 'styled-components';

export const Root = styled.div<{ $dimmed: boolean }>`
  align-items: center;
  background-color: ${(props) =>
    props.$dimmed ? props.theme.basePalette.greyscale.grey4 : props.theme.basePalette.greyscale.white};
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  box-shadow:
    0px 3px 4px 0px rgba(0, 0, 0, 0.12),
    -2px 0px 2px 0px rgba(0, 0, 0, 0.08);
  color: ${(props) =>
    props.$dimmed ? props.theme.basePalette.greyscale.grey1 : props.theme.basePalette.greyscale.black};
  display: grid;
  gap: 12px;
  grid-template-columns: [icon] 35px [date] minmax(200px, 1fr) [card] 150px [status] 100px [amount] minmax(100px, 1fr);
  font-family: Roboto, sans-serif;
  padding: 28px 12px;

  @media (${({ theme }) => theme.breakpoints.phoneOnly}) {
    grid-template-columns: [icon] 35px [date] 1fr [amount] minmax(100px, 1fr);
    grid-template:
      'status status status'
      'icon date amount';
    padding: 12px;
  }
`;

export const Amount = styled.div<{ $status: PaymentStatus }>`
  color: ${({ theme }) => theme.basePalette.primary.indigo};
  font-size: ${({ theme }) => theme.fontSizesUpdated[20]};
  font-weight: 600;
  grid-area: amount;
  text-align: right;

  ${(props) => props.$status === 'canceled' && `color: ${props.theme.basePalette.greyscale.grey1};`}
  ${(props) => props.$status === 'failed' && `color: ${props.theme.basePalette.secondary.error};`}
`;

export const CardInfo = styled.div`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 500;
  grid-area: card;
  padding-right: 8px; /* 20px total with gap */
  text-align: right;

  @media (${({ theme }) => theme.breakpoints.phoneOnly}) {
    display: none;
  }
`;

export const CreatedDate = styled.div`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
`;

export const DateContainer = styled.div`
  grid-area: date;
`;

export const IntervalIconContainer = styled.div<{ $status: PaymentStatus }>`
  align-items: center;
  background-color: ${({ theme }) => theme.basePalette.greyscale.grey4};
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  display: flex;
  grid-area: icon;
  height: 35px;
  justify-content: center;
  width: 35px;

  ${(props) => props.$status === 'failed' && `color: ${props.theme.basePalette.secondary.error}`}
`;

export const LastCardDigits = styled.span`
  color: ${({ theme }) => theme.basePalette.greyscale.grey1};

  &::before {
    /* Leading dots */
    content: '\\2022\\2022\\2022\\00a0';
  }
`;

export const NextContributionDate = styled.div<{ $status: PaymentStatus }>`
  font-size: ${({ theme }) => theme.fontSizesUpdated.xs};
  ${({ $status }) => $status === 'canceled' && 'text-decoration: line-through;'}

  & strong {
    font-weight: 500;
  }
`;

export const Status = styled.div<{ $status: PaymentStatus }>`
  grid-area: status;

  &::before {
    background-color: ${({ theme }) => theme.basePalette.greyscale.grey1};
    border-radius: 7px;
    content: '';
    display: inline-block;
    height: 14px;
    margin-right: 6px;
    position: relative;
    top: 2px;
    width: 14px;

    ${(props) => props.$status === 'processing' && `background-color: ${props.theme.basePalette.primary.engineBlue};`}
    ${(props) => props.$status === 'failed' && `background-color: ${props.theme.basePalette.secondary.error};`}
    ${(props) => props.$status === 'paid' && `background-color: ${props.theme.basePalette.secondary.success};`}
  }

  font-size: ${({ theme }) => theme.fontSizesUpdated.xs};
`;
