import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import CurrencyField from 'components/common/TextField/CurrencyField/CurrencyField';

import { Flex, Label, Content } from './AmountFilter.styled';
import useDebounce from 'hooks/useDebounce';
import usePreviousState from 'hooks/usePreviousState';

const AmountFilter = ({ onChange, className }) => {
  const [amount, setAmountRange] = useState({ amount__gte: '', amount__lte: '' });

  const debouncedAmount = useDebounce(amount, 500);
  const prevAmount = usePreviousState(debouncedAmount);

  const handleChange = useCallback((event) => {
    setAmountRange((prevState) => ({ ...prevState, [event.target.name]: Number(event.target.value) || '' }));
  }, []);

  useEffect(
    () => {
      if (
        debouncedAmount?.amount__gte !== prevAmount?.amount__gte ||
        debouncedAmount?.amount__lte !== prevAmount?.amount__lte
      ) {
        onChange({
          amount__gte: amount.amount__gte * 100 || '',
          amount__lte: amount.amount__lte * 100 || ''
        });
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
          value={amount.amount__gte}
          onChange={handleChange}
          name="amount__gte"
        />
        <CurrencyField
          placeholder="Maximum"
          ariaLabel="Filter maximum amount"
          value={amount.amount__lte}
          onChange={handleChange}
          name="amount__lte"
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
