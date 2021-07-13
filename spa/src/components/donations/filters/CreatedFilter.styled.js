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

export const DatePicker = styled(KeyboardDatePicker)``;
