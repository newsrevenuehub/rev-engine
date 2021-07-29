import styled from 'styled-components';
import { KeyboardDatePicker } from '@material-ui/pickers';

export const CreatedFilter = styled.div`
  display: flex;
  flex-direction: row;
`;

export const DateFilters = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-around;
`;

export const DatePickerWrapper = styled.div``;

export const DateLabel = styled.p``;

export const DatePickerInner = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const DatePicker = styled(KeyboardDatePicker)`
  &&.MuiFormControl-marginNormal {
    margin: 0;
  }
  && label + .MuiInput-formControl {
    margin-top: 16px;
  }
`;
