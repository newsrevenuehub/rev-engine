import styled from 'styled-components';

export const Controls = styled.div``;

export const Header = styled.div`
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.basePalette.greyscale.grey2};
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 5px;
`;

export const Root = styled.div<{ $disabled?: boolean; $highlighted: boolean }>`
  padding: 20px 15px;
  ${(props) => props.$disabled && 'opacity: 0.5'};
  ${(props) => props.$highlighted && `background-color: ${props.theme.basePalette.greyscale.grey4}`};
`;

export const Title = styled.h4`
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  font-weight: 600;
  margin: 0 0 5px 0;
`;
