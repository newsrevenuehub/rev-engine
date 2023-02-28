import { Radio as MuiRadio, RadioProps as MuiRadioProps } from '@material-ui/core';
import styled from 'styled-components';
// See https://create-react-app.dev/docs/adding-images-fonts-and-files/#adding-svgs
import { ReactComponent as CheckedIcon } from './checked.svg';
import { RadioButtonUnchecked } from '@material-ui/icons';

export type RadioProps = MuiRadioProps;

/**
 * @see https://v4.mui.com/components/radio-buttons/#radio
 */
const StyledMuiRadio = styled(MuiRadio)`
  && {
    padding: 0 9px;

    svg {
      height: 24px;
      width: 24px;
    }
  }
`;

export function Radio(props: RadioProps) {
  return <StyledMuiRadio checkedIcon={<CheckedIcon />} icon={<RadioButtonUnchecked />} {...props} />;
}

export default Radio;
