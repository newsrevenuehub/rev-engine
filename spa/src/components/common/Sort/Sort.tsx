import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent, useState } from 'react';

import { SortWrapper } from './Sort.styled';

import { Typography } from '@material-ui/core';
import { Select } from 'components/base';

export interface SortProps extends InferProps<typeof SortPropTypes> {
  onChange?: (value: string) => void;
}

const Sort = ({ options, onChange, className = '' }: SortProps) => {
  const selectOptions = options || [
    {
      label: (
        <p style={{ margin: 0 }}>
          Date <i>(most recent)</i>
        </p>
      ),
      selectedLabel: 'Date',
      value: 'date'
    },
    { label: 'Status', value: 'status' },
    {
      label: (
        <p style={{ margin: 0 }}>
          Amount <em>(high to low)</em>
        </p>
      ),
      selectedLabel: 'Amount',
      value: 'amount'
    }
  ];

  const [value, setValue] = useState(selectOptions[0].value);

  const handleChange = (event: ChangeEvent<{ value: unknown }>) => {
    setValue(event.target.value as string);
    if (typeof onChange === 'function') onChange(event.target.value as string);
  };

  return (
    <SortWrapper className={className!}>
      <Typography variant="body2" color="textSecondary">
        Sort:
      </Typography>
      <Select options={selectOptions} value={value} onChange={handleChange} />
    </SortWrapper>
  );
};

const SortPropTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.node.isRequired,
      value: PropTypes.string.isRequired,
      selectedLabel: PropTypes.string
    }).isRequired
  ),
  className: PropTypes.string,
  onChange: PropTypes.func
};

Sort.propTypes = SortPropTypes;

export default Sort;
