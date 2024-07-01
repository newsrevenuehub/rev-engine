import MuiMenuItem from '@material-ui/core/MenuItem';
import MuiListItemIcon from '@material-ui/core/ListItemIcon';
import MuiTypography from '@material-ui/core/Typography';
import { IconButton } from 'components/base';
import styled from 'styled-components';

export const ContactInfoButton = styled(IconButton)`
  && {
    height: 28px;
    width: 28px;
    padding: 0;

    svg {
      fill: ${({ theme }) => theme.basePalette.greyscale.grey1};
    }

    @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
      right: 20px;
    }
  }
`;

export const ListWrapper = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 18px;
  margin: 0;
  background-color: ${(props) => props.theme.basePalette.greyscale.grey3};
`;

export const MenuItem = styled(MuiMenuItem)`
  && {
    height: 40px;
    padding: 5px 7px;
    margin: 0 -7px;
    border-radius: ${(props) => props.theme.muiBorderRadius.lg};
    display: flex;
    align-items: center;
    gap: 18px;

    :hover {
      background-color: ${(props) => props.theme.colors.navSectionLabelColor};
    }
  }
`;

export const ListItemIcon = styled(MuiListItemIcon)`
  && {
    min-width: unset;
    color: ${(props) => props.theme.colors.sidebarBackground};

    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

export const Typography = styled(MuiTypography)`
  && {
    color: ${(props) => props.theme.colors.sidebarBackground};
    font-size: ${(props) => props.theme.fontSizesUpdated.sm};
    font-weight: 400;
  }
`;

export const CloseButton = styled(IconButton)`
  && {
    position: absolute;
    top: 14px;
    right: 14px;
    height: 24px;
    width: 24px;
    padding: 0;

    .NreButtonLabel {
      height: 24px;
      width: 24px;
    }

    svg {
      fill: ${({ theme }) => theme.basePalette.greyscale.grey2};
    }
  }
`;
