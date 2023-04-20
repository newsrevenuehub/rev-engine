import { EnginePlan } from 'hooks/useContributionPage';
import styled from 'styled-components';

const planColors = {
  CORE: '#62ffe3',
  FREE: '#f2ff59',
  PLUS: '#f323ff'
};

export const PlanCost = styled.span`
  color: ${({ theme }) => theme.colors.black};
  font-size: ${({ theme }) => theme.fontSizesUpdated[20]};
  font-weight: 500;
  position: relative;
`;

export const PlanCostInterval = styled.span`
  color: ${({ theme }) => theme.colors.muiGrey[600]};
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  font-weight: 400;
  padding-left: 10px;
  /*
  Align to top of other text. Doing this via flexbox seems fiddly due to line
  height etc.
  */
  position: relative;
  top: -0.25em;
`;

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
