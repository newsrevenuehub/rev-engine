import { Button, Typography, IconButton } from '@material-ui/core';
import styled from 'styled-components';

import { PAYMENT_STATUS } from 'constants';

export const ContributorDashboard = styled.main`
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 3rem 4.5rem;
  background: ${(props) => props.theme.colors.cstm_mainBackground};
  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    padding: 1.5rem 1rem;
  }
`;

export const StatusCellWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const StatusText = styled.p`
  margin-left: 1rem;
  font-size: ${(props) => (props.size === 'sm' ? '11px' : '14px')};
  padding: 0.2rem 0.8rem;
  color: ${(props) => props.theme.colors.black};
  border-radius: ${(props) => props.theme.muiBorderRadius.md};
  line-height: 1.2;
  ${(props) =>
    ({
      [PAYMENT_STATUS.PROCESSING]: `
        background-color: ${props.theme.colors.status.processing};
        font-style: italic;
      `,
      [PAYMENT_STATUS.FAILED]: `
        background-color: ${props.theme.colors.status.failed};
      `,
      [PAYMENT_STATUS.PAID]: `
        background-color: ${props.theme.colors.status.done};
      `,
      [PAYMENT_STATUS.CANCELED]: `
        background-color: ${props.theme.colors.status.warning};
        font-style: italic;
      `,
      [PAYMENT_STATUS.FLAGGED]: '',
      [PAYMENT_STATUS.REJECTED]: ''
    }[props.status])}
`;

export const Title = styled(Typography)`
  && {
    font-size: ${(props) => props.theme.fontSizesUpdated.h1};
    font-weight: 600;
    margin-bottom: 1rem;
  }
`;

export const Disclaimer = styled(Typography)`
  && {
    font-size: ${(props) => props.theme.fontSizesUpdated.md};
    color: ${(props) => props.theme.colors.muiGrey[600]};
    margin-bottom: 3rem;
  }
`;

export const EditButton = styled(IconButton)`
  && {
    color: ${(props) => props.theme.colors.muiGrey[300]};
  }
`;

export const Time = styled.span`
  margin-left: 1rem;
`;

export const PaymentMethodCell = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  cursor: ${(props) => (props.interactive ? 'pointer' : 'default')};
`;

export const PaymentCardInfoWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const BrandIcon = styled.img`
  max-width: 45px;
  height: 30px;
  margin-right: 0.8rem;
`;

export const Last4 = styled.p`
  margin: 0;
  color: ${(props) => props.theme.colors.grey[2]};
  white-space: nowrap;
  line-height: 1;
`;

export const CancelButton = styled(Button)`
  && {
    text-transform: unset;
    font-weight: 700;
    font-size: ${(props) => props.theme.fontSizesUpdated.sm};
    color: ${(props) => props.theme.colors.error.primary};
  }
`;
