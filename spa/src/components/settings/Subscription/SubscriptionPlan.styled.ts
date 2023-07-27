import { EnginePlan } from 'hooks/useContributionPage';
import styled from 'styled-components';

const planColors = {
  CORE: '#62ffe3',
  FREE: '#f2ff59',
  PLUS: '#f323ff'
};

export const PlanName = styled.span<{ $plan: EnginePlan['name'] }>`
  background-color: ${({ $plan }) => planColors[$plan as keyof typeof planColors]};
  color: ${({ theme }) => theme.colors.muiGrey[900]};
  font: 400 ${({ theme }) => theme.fontSizesUpdated.lg} 'DM Mono', monospace;
`;

export const Root = styled.div`
  display: flex;
  justify-content: space-between;
  width: 345px;
`;
