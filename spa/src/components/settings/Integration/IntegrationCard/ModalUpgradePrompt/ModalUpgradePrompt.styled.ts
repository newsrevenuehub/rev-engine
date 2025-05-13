import CoreUpgradeIcon from 'assets/icons/upgrade-core.svg?react';
import styled from 'styled-components';

export const Root = styled.div`
  border: 1px solid ${({ theme }) => theme.basePalette.greyscale['30']};
  border-radius: 10px;
  display: grid;
  position: relative;
  gap: 12px;
  padding: 13px 13px 13px 55px;
`;

export const Text = styled.p`
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 500;
  margin: 0;
`;

export const UpgradeIcon = styled(CoreUpgradeIcon)`
  height: 30px;
  left: 8px;
  position: absolute;
  top: 9px;
  width: 30px;
`;
