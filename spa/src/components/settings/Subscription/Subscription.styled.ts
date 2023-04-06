import styled from 'styled-components';
import { Link } from 'components/base';

export const PricingLink = styled(Link)`
  border-bottom: 1px solid ${({ theme }) => theme.colors.muiGrey[100]};
  padding-bottom: 34px;
`;

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`;
