import styled from 'styled-components';

export const Downgrade = styled.p`
  /* Gap in main layout is 40px. We want to leave 12px between it and header above it. */
  margin-top: -28px;
`;

export const PricingLinkContainer = styled.p`
  border-bottom: 1px solid ${({ theme }) => theme.colors.muiGrey[100]};
  padding-bottom: 34px;
`;

export const SubscriptionPlanContainer = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.muiGrey[100]};
  padding-bottom: 34px;
`;

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`;
