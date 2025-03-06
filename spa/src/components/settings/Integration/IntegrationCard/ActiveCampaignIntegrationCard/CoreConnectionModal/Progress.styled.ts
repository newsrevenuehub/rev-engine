import styled from 'styled-components';

export const Root = styled.div`
  align-items: center;
  display: flex;
  gap: 12px;
`;

export const CurrentDot = styled.div<{ $final: boolean }>`
  align-items: center;
  background-color: ${({ $final, theme }) => ($final ? theme.basePalette.purple['-20'] : 'transparent')};
  border-radius: 20px;
  border: 3px solid ${({ theme }) => theme.basePalette.purple['-20']};
  color: ${({ $final, theme }) => ($final ? theme.basePalette.primary.chartreuse : theme.basePalette.purple['-20'])};
  display: flex;
  font-size: ${({ theme }) => theme.fontSizesUpdated[20]};
  font-weight: 600;
  height: 40px;
  justify-content: center;
  width: 40px;
`;

export const Dot = styled.div<{ $active: boolean }>`
  // FIXME color literal
  background-color: ${({ $active, theme }) => ($active ? theme.basePalette.primary.purple : '#b1b1b1')};
  border-radius: 8px;
  height: 16px;
  width: 16px;
`;
