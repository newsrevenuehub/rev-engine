import { ReactComponent as CoreUpgradeIcon } from 'assets/icons/upgrade-core.svg';
import styled from 'styled-components';

export const Root = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.muiGrey[400]};
  border-radius: 10px;
  display: grid;
  position: relative;
  gap: 12px;
  padding: 13px 13px 13px 55px;
`;

export const Text = styled.p`
  color: ${({ theme }) => theme.colors.muiGrey[900]};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  margin: 0;
`;

export const UpgradeIcon = styled(CoreUpgradeIcon)`
  height: 30px;
  left: 8px;
  position: absolute;
  top: 9px;
  width: 30px;
`;
