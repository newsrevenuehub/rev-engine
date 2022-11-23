import {
  FormControlLabel as MuiFormControlLabel,
  FormControlLabelProps as MuiFormControlProps
} from '@material-ui/core';
import styled from 'styled-components';

export type FormControlLabelProps = MuiFormControlProps;

/**
 * @see https://v4.mui.com/api/form-control-label/#formcontrollabel-api
 */
const StyledMuiFormControlLabel = styled(MuiFormControlLabel)`
  && {
    align-items: flex-start;

    .NreFormControlLabelLabel {
      color: #282828;
      font: 16px Roboto, sans-serif;
      line-height: 24px;
    }
  }
`;

export function FormControlLabel(props: FormControlLabelProps) {
  return <StyledMuiFormControlLabel classes={{ label: 'NreFormControlLabelLabel' }} {...props} />;
}

export default FormControlLabel;
