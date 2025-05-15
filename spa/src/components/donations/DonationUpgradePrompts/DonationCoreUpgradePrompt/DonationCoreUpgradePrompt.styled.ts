import { IconButton } from '@material-ui/core';
import CoreUpgradeIcon from 'assets/icons/upgrade-core.svg?react';
import { Link } from 'components/base';
import styled from 'styled-components';

export const CloseButton = styled(IconButton)`
  && {
    color: ${({ theme }) => theme.colors.muiGrey[400]};
    position: absolute;
    right: 0px;
    top: 0px;

    svg {
      height: 16px;
      width: 16px;
    }
  }
`;

export const Header = styled.h2`
  color: ${({ theme }) => theme.colors.muiGrey[900]};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 500;
  margin: 0;
  margin-top: 2px; /* align with icon beside it */
`;

export const LearnMoreLink = styled(Link)`
  && {
    font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
    font-weight: 600;
    text-transform: uppercase;
  }
`;

export const Root = styled.div`
  border: 1px solid ${({ theme }) => theme.basePalette.greyscale['30']};
  border-radius: 10px;
  display: grid;
  gap: 12px;
  padding: 15px 15px 15px 50px;
  position: relative;
  width: 360px;
`;

export const Text = styled.p`
  color: ${({ theme }) => theme.colors.muiGrey[900]};
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  margin: 0;
`;

export const UpgradeIcon = styled(CoreUpgradeIcon)`
  height: 24px;
  left: 18px;
  position: absolute;
  top: 15px;
  width: 24px;
`;
