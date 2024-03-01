import styled from 'styled-components';
import { revEngineTheme } from 'styles/themes';

type Color = 'CORE' | 'CUSTOM';

const colors: Record<Color, string> = {
  CORE: revEngineTheme.plan.core.background,
  CUSTOM: revEngineTheme.basePalette.primary.brandBlue
};

export const Root = styled.span<{ $type: Color }>`
  align-items: center;
  background: ${(props) => colors[props.$type]};
  border-radius: ${({ theme }) => theme.muiBorderRadius.md};
  color: ${({ theme }) => theme.colors.account.purple[1]};
  display: inline-flex;
  gap: 3px;
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  font-weight: 500;
  height: 20px;
  line-height: 100%;
  justify-content: center;
  padding: 2px 7px;

  svg {
    height: 16px;
    width: 16px;
  }
`;
