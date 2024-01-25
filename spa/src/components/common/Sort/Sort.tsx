import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent, useState } from 'react';

import { SortWrapper } from './Sort.styled';

import { Typography } from '@material-ui/core';
import { Select } from 'components/base';

export interface SortProps extends InferProps<typeof SortPropTypes> {
  onChange?: (value: string) => void;
}

const Sort = ({ id, options, onChange, className = '' }: SortProps) => {
  const [value, setValue] = useState(options[0].value);

  const handleChange = (event: ChangeEvent<{ value: string }>) => {
    setValue(event.target.value);
    onChange?.(event.target.value);
  };

  return (
    <SortWrapper className={className!}>
      <Typography variant="body2" color="textSecondary" id={id}>
        Sort:
      </Typography>
      <Select aria-labelledby={id} options={options} value={value} onChange={handleChange} />
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
  ).isRequired,
  className: PropTypes.string,
  onChange: PropTypes.func,
  id: PropTypes.string.isRequired
};

Sort.propTypes = SortPropTypes;

export default Sort;
