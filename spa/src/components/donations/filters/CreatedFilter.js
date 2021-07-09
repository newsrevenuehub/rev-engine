import { useState } from 'react';
import * as S from './CreatedFilter.styled';

// Depts
import { useTheme } from 'styled-components';
import 'date-fns';
import DateFnsUtils from '@date-io/date-fns';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';

// Children
import { FilterWrapper, FilterLabel } from 'components/donations/filters/Filters';
import formatDatetimeForAPI from 'utilities/formatDatetimeForAPI';

function CreatedFilter({ handleFilterChange }) {
  const theme = useTheme();
  const [fromDate, setFromDate] = useState(new Date(2019, 0, 1));
  const [toDate, setToDate] = useState(new Date());

  const updateFilters = () => {
    handleFilterChange('created', {
      created__gte: formatDatetimeForAPI(fromDate, false),
      created__lte: formatDatetimeForAPI(toDate, false)
    });
  };

  return (
    <MuiPickersUtilsProvider utils={DateFnsUtils}>
      <FilterWrapper>
        <S.CreatedFilter>
          <FilterLabel>Date:</FilterLabel>
          <S.DateFilters>
            <S.DatePickerWrapper>
              <S.DateLabel>From:</S.DateLabel>
              <S.DatePicker
                disableToolbar
                variant="inline"
                format="MM/dd/yyyy"
                margin="normal"
                value={fromDate}
                onChange={setFromDate}
                onClose={updateFilters}
                onBlur={updateFilters}
                KeyboardButtonProps={{
                  'aria-label': 'change from date'
                }}
                inputProps={{
                  style: {
                    fontFamily: theme.font
                  }
                }}
              />
            </S.DatePickerWrapper>
            <S.DatePickerWrapper>
              <S.DateLabel>To:</S.DateLabel>
              <S.DatePicker
                disableToolbar
                variant="inline"
                format="MM/dd/yyyy"
                margin="normal"
                value={toDate}
                onChange={setToDate}
                onClose={updateFilters}
                onBlur={updateFilters}
                KeyboardButtonProps={{
                  'aria-label': 'change to date'
                }}
                inputProps={{
                  style: {
                    fontFamily: theme.font
                  }
                }}
              />
            </S.DatePickerWrapper>
          </S.DateFilters>
        </S.CreatedFilter>
      </FilterWrapper>
    </MuiPickersUtilsProvider>
  );
}

export default CreatedFilter;
