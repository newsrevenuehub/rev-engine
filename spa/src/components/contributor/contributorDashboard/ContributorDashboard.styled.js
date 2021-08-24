import styled from 'styled-components';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const ContributorDashboard = styled.main`
  padding: 4rem 2rem;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    padding: 0;
  }
`;

export const Disclaimer = styled.p`
  font-size: ${(props) => props.theme.fontSizes[0]};
  color: ${(props) => props.theme.colors.grey[2]};
`;

export const StatusCellWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const StatusText = styled.p`
  margin-left: 1rem;
  font-size: ${(props) => (props.size === 'sm' ? '11px' : '14px')};
`;

export const StatusCellIcon = styled(FontAwesomeIcon)`
  font-size: ${(props) => (props.size === 'sm' ? '12px' : '18px')};
  color: ${(props) => {
    switch (props.status) {
      case 'failed':
        return props.theme.colors.caution;
      case 'processing':
        return props.theme.colors.grey[1];
      case 'paid':
        return props.theme.colors.success;
      case 'canceled':
        return props.theme.colors.warning;
      case 'flagged':
        return props.theme.colors.caution;
      case 'rejected':
        return props.theme.colors.grey[1];
      default:
        return props.theme.colors.grey[1];
    }
  }};
`;

export const PaymentMethodCell = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  cursor: ${(props) => (props.interactive ? 'pointer' : 'default')};
`;

export const BrandIcon = styled.img`
  width: 45px;
  height: auto;
`;

export const Last4 = styled.p`
  color: ${(props) => props.theme.colors.grey[2]};
  white-space: nowrap;
`;

export const CancelButton = styled.button`
  background: none;
  border: none;
`;

export const CancelIcon = styled(FontAwesomeIcon)`
  color: ${(props) => props.theme.colors.caution};
  opacity: 0.7;
  font-size: 16px;
  cursor: pointer;

  transition: all 0.1s ease-in-out;

  &:hover {
    transform: translate(-1px, -1px);
  }
  &:active {
    transform: translate(1px, 1px);
  }
`;
