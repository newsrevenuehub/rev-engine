import { Switch as MuiSwitch, SwitchProps as MuiSwitchProps } from '@material-ui/core';
import styled from 'styled-components';

export type SwitchProps = MuiSwitchProps;

/**
 * @see https://v4.mui.com/api/switch/
 */
export const StyledSwitch = styled(MuiSwitch)<SwitchProps>`
  && {
    &.NreSwitchRoot {
      padding: 7px;
    }

    .NreThumb {
      height: 20px;
      width: 20px;
      background: #ffffff;
      box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.18);
    }

    .NreTrack {
      height: 24px;
      width: 44px;
      border-radius: ${(props) => props.theme.muiBorderRadius[14]};
      box-shadow: inset 0px 0px 3px rgba(37, 25, 43, 0.2);
      background: ${(props) => props.theme.colors.muiGrey[100]};
      border: 1px solid #dbdbdb;
    }

    .NreChecked + .NreTrack {
      background: ${(props) => props.theme.colors.muiTeal[600]};
      border: 1px solid #028372;
      opacity: 1;
    }
  }
`;

export function Switch(props: SwitchProps) {
  return (
    <StyledSwitch
      {...props}
      classes={{
        root: 'NreSwitchRoot',
        thumb: 'NreThumb',
        track: 'NreTrack',
        checked: 'NreChecked',
        ...props.classes
      }}
    />
  );
}

export default Switch;
