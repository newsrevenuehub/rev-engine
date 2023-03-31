import { EnginePlan } from 'hooks/useContributionPage';
import styled from 'styled-components';

const colors: Record<EnginePlan['name'], string> = {
  CORE: '#62ffe3',
  FREE: '#f5ff75',
  PLUS: '#f323ff'
};

export const Root = styled.span<{ $plan: EnginePlan['name'] }>`
  align-items: center;
  background: ${(props) => colors[props.$plan]};
  border-radius: ${({ theme }) => theme.muiBorderRadius.md};
  color: ${({ theme }) => theme.colors.account.purple[1]};
  display: inline-flex;
  font-size: ${({ theme }) => theme.fontSizesUpdated.xs};
  font-weight: 600;
  height: 15px;
  line-height: 100%;
  justify-content: center;
  text-transform: uppercase;
  width: 40px;
`;
