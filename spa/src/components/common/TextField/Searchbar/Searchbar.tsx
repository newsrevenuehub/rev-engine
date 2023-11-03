import { ChangeEvent, useState } from 'react';
import PropTypes, { InferProps } from 'prop-types';

import { Input } from './Searchbar.styled';

import SearchIcon from 'assets/icons/search.svg?react';

export interface SearchbarProps extends InferProps<typeof SearchbarPropTypes> {
  onChange?: (value: string) => void;
}

const Searchbar = ({ placeholder, onChange, className = '' }: SearchbarProps) => {
  const [search, setSearch] = useState('');

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    if (typeof onChange === 'function') onChange(event.target.value);
  };

  return (
    <Input
      className={className!}
      aria-label={`Search for ${placeholder}`}
      style={{ backgroundImage: `url(${SearchIcon})` }}
      placeholder={`Search ${placeholder}...`}
      value={search}
      onChange={handleChange}
    />
  );
};

const SearchbarPropTypes = {
  placeholder: PropTypes.string.isRequired,
  className: PropTypes.string,
  onChange: PropTypes.func
};

Searchbar.propTypes = SearchbarPropTypes;

export default Searchbar;
