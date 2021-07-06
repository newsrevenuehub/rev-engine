import styled from 'styled-components';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const ContributorDashboard = styled.main`
  padding: 4rem 2rem;
`;

export const StatusCellWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const StatusCellIcon = styled(FontAwesomeIcon)`
  font-size: 20px;
  color: ${(props) => {
    switch (props.status) {
      case 'failed':
        return props.theme.colors.caution;
      case 'processing':
        return props.theme.colors.grey[2];
      case 'paid':
        return props.theme.colors.success;
      default:
        return;
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
