import { useState, useEffect } from 'react';
import * as S from './CreatedFilter.styled';

// Depts
import { useTheme } from 'styled-components';
import 'date-fns';
import DateFnsUtils from '@date-io/date-fns';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';

// Children
import XButton from 'elements/buttons/XButton';
import { FilterWrapper, FilterLabel } from 'components/donations/filters/Filters';
import formatDatetimeForAPI from 'utilities/formatDatetimeForAPI';

function CreatedFilter({ handleFilterChange }) {
  const theme = useTheme();
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(new Date());

  const updateFilters = () => {
    handleFilterChange('created', {
      created__gte: fromDate ? formatDatetimeForAPI(fromDate, false) : '',
      created__lte: toDate ? formatDatetimeForAPI(toDate, false) : ''
    });
  };

  useEffect(() => {
    updateFilters();
  }, [fromDate, toDate]);

  return (
    <MuiPickersUtilsProvider utils={DateFnsUtils}>
      <FilterWrapper data-testid="created-filter">
        <S.CreatedFilter>
          <FilterLabel>Date:</FilterLabel>
          <S.DateFilters>
            <S.DatePickerWrapper>
              <S.DateLabel>From:</S.DateLabel>
              <S.DatePickerInner>
                <S.DatePicker
                  disableToolbar
                  variant="inline"
                  format="MM/dd/yyyy"
                  placeholder="Select a from date"
                  margin="normal"
                  value={fromDate}
                  onChange={setFromDate}
                  KeyboardButtonProps={{
                    'aria-label': 'change from date'
                  }}
                  inputProps={{
                    style: {
                      fontFamily: theme.font
                    }
                  }}
                />
                <XButton onClick={() => setFromDate(null)} />
              </S.DatePickerInner>
            </S.DatePickerWrapper>
            <S.DatePickerWrapper>
              <S.DateLabel>To:</S.DateLabel>
              <S.DatePickerInner>
                <S.DatePicker
                  disableToolbar
                  variant="inline"
                  format="MM/dd/yyyy"
                  placeholder="Select a to date"
                  margin="normal"
                  value={toDate}
                  onChange={setToDate}
                  KeyboardButtonProps={{
                    'aria-label': 'change to date'
                  }}
                  inputProps={{
                    style: {
                      fontFamily: theme.font
                    }
                  }}
                />
                <XButton onClick={() => setToDate(null)} />
              </S.DatePickerInner>
            </S.DatePickerWrapper>
          </S.DateFilters>
        </S.CreatedFilter>
      </FilterWrapper>
    </MuiPickersUtilsProvider>
  );
}

export default CreatedFilter;
