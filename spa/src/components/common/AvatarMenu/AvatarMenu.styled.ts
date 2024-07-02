import {
  Avatar as MuiAvatar,
  Divider as MuiDivider,
  MenuItem as MuiMenuItem,
  Typography as MuiTypography,
  ListItemIcon as MuiListItemIcon
} from '@material-ui/core';
import styled from 'styled-components';

export const Container = styled.button<{ open: string }>`
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 0;
  background: transparent;
  border: none;
  padding: 9px 0 9px 10px;
  max-height: 48px;

  svg {
    fill: white;
    height: 27px;
    width: 27px;
    margin-left: -3px;
  }

  ${(props) =>
    props.open === 'open' &&
    `background-color: ${props.theme.colors.account.purple[1]};
  `}

  :hover {
    background-color: ${(props) => props.theme.colors.account.purple[1]};
  }
`;

export const ModalHeader = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  font-family: ${(props) => props.theme.systemFont};
  color: ${(props) => props.theme.colors.muiGrey[700]};
  font-weight: 600;
  margin: 0 0 9px;
`;

export const ListWrapper = styled.ul`
  padding: 0;
  margin: 0;
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

export const Avatar = styled(MuiAvatar)`
  && {
    height: 31px;
    width: 31px;
    border: 1px solid white;
    font-size: ${(props) => props.theme.fontSizesUpdated.sm};
    background-color: ${(props) => props.theme.colors.muiLightBlue[800]};
  }
`;

export const Typography = styled(MuiTypography)`
  && {
    color: ${(props) => props.theme.colors.sidebarBackground};
    font-size: ${(props) => props.theme.fontSizesUpdated.sm};
    font-weight: 400;
  }
`;

export const Divider = styled(MuiDivider)`
  && {
    margin: 10px -15px;
  }
`;

export const MenuItem = styled(MuiMenuItem)`
  && {
    padding: 5px 7px;
    margin: 0 -7px;
    border-radius: ${(props) => props.theme.muiBorderRadius.lg};
    background-color: ${(props) => props.theme.colors.muiGrey[100]};
    display: flex;
    align-items: center;
    gap: 18px;

    :hover {
      background-color: ${(props) => props.theme.colors.navSectionLabelColor};
    }
  }
`;
