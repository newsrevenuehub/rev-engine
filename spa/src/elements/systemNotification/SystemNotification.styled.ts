import styled from 'styled-components';
import { IconButton as MuiIconButton } from '@material-ui/core';

import { SystemNotificationTypes } from './commonTypes';
import { revEngineTheme } from 'styles/themes';

export const SystemNotificationWrapper = styled.div`
  display: flex;
  max-width: 490px;
  position: relative;
  border-radius: 4px;
  box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.16);
`;

export const IconBoxIcon = styled.div`
  > svg {
    height: 30px;
    width: 30px;
  }
  color: ${(props) => props.theme.colors.white};
`;

export const IconButton = styled(MuiIconButton)`
  && {
    position: absolute;
    top: 2px;
    right: 2px;
    padding: 0;
    color: ${(props) => props.theme.colors.muiGrey[600]};
  }
`;

interface IconBoxProps {
  notificationType: SystemNotificationTypes;
}

function getIconBoxBackground({ notificationType }: { notificationType: SystemNotificationTypes }) {
  switch (notificationType) {
    case 'success':
      return 'linear-gradient(212.12deg, #60E0F9 -26.53%, #008E7C 70.87%)';
    case 'error':
      return 'linear-gradient(212.12deg, #FA9908 -26.53%, #C8203F 70.87%)';
    case 'warning':
      return 'linear-gradient(215.35deg, #F2FF59 -59.69%, #FA9908 63.23%)';
    case 'info':
      return 'linear-gradient(214.59deg, #60E0F9 -37.06%, #157CB2 68.44%)';
  }
}

export const IconBox = styled.div<IconBoxProps>`
  min-width: 68px;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
  background: ${({ notificationType }) => getIconBoxBackground({ notificationType })};
  display: flex;
  align-items: center;
  justify-content: center;
`;

interface HeaderProps extends IconBoxProps {}

function getHeaderColor({ notificationType }: { notificationType: SystemNotificationTypes }) {
  switch (notificationType) {
    case 'success':
      return revEngineTheme.colors.muiTeal[600];
    case 'error':
      return revEngineTheme.colors.error.primary;
    case 'warning':
      return '#FA9908';
    case 'info':
      return revEngineTheme.colors.muiLightBlue[800];
  }
}

export const Header = styled.h2<HeaderProps>`
  color: ${({ notificationType }) => getHeaderColor({ notificationType })};
  font-size: 16px;
  font-weight: 600;
  line-height: 18.75px;
  margin: 0;
  margin-bottom: 10px;
`;

export const Main = styled.div`
  padding: 9px 16px;
  > p {
    margin: 0;
    color: ${(props) => props.theme.colors.muiGrey[900]};
  }
`;
