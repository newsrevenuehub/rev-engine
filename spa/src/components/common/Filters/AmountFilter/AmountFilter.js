import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import CurrencyField from 'components/common/TextField/CurrencyField/CurrencyField';

import { Flex, Label, Content } from './AmountFilter.styled';
import usePreviousState from 'hooks/usePreviousState';
import { useDebounce } from 'use-debounce';

const AmountFilter = ({ onChange, className }) => {
  const [amount, setAmountRange] = useState({ gte: '', lte: '' });

  const [debouncedAmount] = useDebounce(amount, 500);
  const prevAmount = usePreviousState(debouncedAmount);

  const handleChange = useCallback((event) => {
    setAmountRange((prevState) => ({ ...prevState, [event.target.name]: event.target.value || '' }));
  }, []);

  useEffect(
    () => {
      if ((debouncedAmount?.gte !== prevAmount?.gte || debouncedAmount?.lte !== prevAmount?.lte) && prevAmount) {
        onChange(debouncedAmount);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedAmount, onChange] // Only call effect if debounced amount term changes
  );

  return (
    <Flex className={className} data-testid="amount-filter">
      <Label>Amount</Label>
      <Content>
        <CurrencyField
          placeholder="Minimum"
          ariaLabel="Filter minimum amount"
          value={amount.gte}
          onChange={handleChange}
          name="gte"
        />
        <CurrencyField
          placeholder="Maximum"
          ariaLabel="Filter maximum amount"
          value={amount.lte}
          onChange={handleChange}
          name="lte"
        />
      </Content>
    </Flex>
  );
};

AmountFilter.propTypes = {
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string
};

AmountFilter.defaultProps = {
  className: ''
};

export default AmountFilter;
