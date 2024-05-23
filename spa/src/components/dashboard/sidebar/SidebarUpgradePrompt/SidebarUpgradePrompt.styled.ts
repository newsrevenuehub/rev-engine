import { IconButton } from '@material-ui/core';
import { RouterLinkButton } from 'components/base';
import { EnginePlan } from 'hooks/useContributionPage';
import styled from 'styled-components';

export const CloseButton = styled(IconButton)`
  && {
    color: ${({ theme }) => theme.colors.muiGrey[300]};
    height: 24px;
    position: absolute;
    right: 4px;
    top: 4px;
    width: 24px;

    svg {
      height: 16px;
      width: 16px;
    }

    &:hover {
      background-color: ${({ theme }) => theme.basePalette.indigo[-30]};
    }
  }
`;

export const Header = styled.h2`
  color: ${({ theme }) => theme.colors.white};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 500;
  margin-top: 2px; /* align with icon beside it */
`;

export const UpgradeButton = styled(RouterLinkButton)`
  padding: 10px 30px;
`;

export const Root = styled.div`
  background: ${({ theme }) => theme.basePalette.indigo[-10]};
  padding: 15px 15px 15px 50px;
  position: relative;
`;

export const Text = styled.p`
  color: ${({ theme }) => theme.colors.white};
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
`;

export const IconWrapper = styled.div<{ $plan: EnginePlan['name'] }>`
  height: 24px;
  left: 18px;
  position: absolute;
  top: 15px;
  width: 24px;
  border-radius: 24px;
  fill: ${({ theme }) => theme.basePalette.indigo['-10']};

  ${({ $plan, theme }) => {
    switch ($plan) {
      case 'FREE':
        return `background-color: ${theme.plan.core.background};`;
      case 'CORE':
        return `background-color: ${theme.plan.plus.background};`;
      case 'PLUS':
        return `background-color: ${theme.basePalette.primary.brandBlue};`;
    }
  }}
`;
