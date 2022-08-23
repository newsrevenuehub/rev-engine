import { useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import SearchIcon from 'assets/icons/search.svg';

const Searchbar = ({ placeholder, onChange, className }) => {
  const [search, setSearch] = useState('');

  const handleChange = (event) => {
    setSearch(event.target.value);
    if (typeof onChange === 'function') onChange(event.target.value);
  };

  return (
    <div className={className}>
      <label htmlFor="searchbar" className="hidden">
        Search for {placeholder}
      </label>
      <input
        className={clsx('w-full p-2 bg-neutral-200 rounded text-neutral-500 bg-no-repeat bg-scroll bg-left pl-10')}
        style={{ backgroundImage: `url(${SearchIcon})`, backgroundPositionX: '0.7rem', backgroundSize: '1.1rem' }}
        id="searchbar"
        placeholder={`Search ${placeholder}...`}
        value={search}
        onChange={handleChange}
      />
    </div>
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
