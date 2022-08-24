import { useState } from 'react';
import PropTypes from 'prop-types';

import { Input } from './Searchbar.styled';

import SearchIcon from 'assets/icons/search.svg';

const Searchbar = ({ placeholder, onChange, className }) => {
  const [search, setSearch] = useState('');

  const handleChange = (event) => {
    setSearch(event.target.value);
    if (typeof onChange === 'function') onChange(event.target.value);
  };

  return (
    <Input
      className={className}
      aria-label={`Search for ${placeholder}`}
      style={{ backgroundImage: `url(${SearchIcon})` }}
      placeholder={`Search ${placeholder}...`}
      value={search}
      onChange={handleChange}
    />
  );
};

Searchbar.propTypes = {
  placeholder: PropTypes.string.isRequired,
  className: PropTypes.string,
  onChange: PropTypes.func
};

Searchbar.defaultProps = {
  className: '',
  onChange: undefined
};

export default Searchbar;
