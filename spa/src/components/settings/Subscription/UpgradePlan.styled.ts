import styled from 'styled-components';

export const NewBadge = styled.div`
  align-items: center;
  background-color: ${({ theme }) => theme.basePalette.primary.chartreuse};
  border-radius: 20px;
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  font-weight: normal;
  display: flex;
  height: 40px;
  position: absolute;
  right: 0;
  justify-content: center;
  top: 0;
  width: 40px;
  transform: rotate(15deg) translateY(-5px);
`;

export const PlusFeatureList = styled.ul`
  margin: 12px 0 20px 0;
`;

export const PlusHeader = styled.h4`
  border-bottom: 1px solid ${({ theme }) => theme.basePalette.greyscale.grey3};
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  padding-bottom: 5px;
  margin-bottom: 0;
  position: relative;
  width: 280px;
`;

export const PlusHeaderHighlight = styled.span`
  background-color: #f323ff;
`;

export const PricingTableContainer = styled.div`
  width: 400px;
`;
