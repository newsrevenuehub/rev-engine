import { useState, useEffect, useRef, useCallback } from 'react';
import * as S from './AmountFilter.styled';

// Children
import { FilterWrapper, FilterLabel } from 'components/donations/filters/Filters';

const MAX_AMOUNT = 100001;
const SET_FILTER_TIMEOUT = 500;

function AmountFilter({ handleFilterChange }) {
  const timeoutRef = useRef(null);
  const [value, setValue] = useState([0, MAX_AMOUNT]);

  const handleAmountFilterChange = useCallback(
    (range) => {
      const amountFilters = {};
      const gte = range[0];
      amountFilters.amount__gte = gte;
      const lte = range[1];
      if (lte !== MAX_AMOUNT) amountFilters.amount__lte = lte;
      else delete amountFilters.amount__lte;
      handleFilterChange('amount', amountFilters);
    },
    [handleFilterChange]
  );

  // Only update filter after a slight delay
  useEffect(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      handleAmountFilterChange(value);
    }, SET_FILTER_TIMEOUT);
  }, [value]);

  const handleChange = (_e, newValue) => {
    setValue(newValue);
  };

  return (
    <FilterWrapper data-testid="amount-filter">
      <S.AmountFilter>
        <FilterLabel>Amount:</FilterLabel>
        <S.Slider
          value={value}
          onChange={handleChange}
          min={0}
          max={MAX_AMOUNT}
          step={5 * 100}
          valueLabelDisplay="on"
          aria-labelledby="range-slider"
          valueLabelFormat={formatLabel}
          getAriaValueText={formatLabel}
        />
      </S.AmountFilter>
    </FilterWrapper>
  );
}

function formatLabel(value) {
  if (value === MAX_AMOUNT) return '∞';
  else return `$${value / 100}`;
}

export default AmountFilter;
