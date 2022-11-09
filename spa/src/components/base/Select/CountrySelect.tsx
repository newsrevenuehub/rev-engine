import countryCodes from 'country-code-lookup';
import { SearchableSelect, SearchableSelectProps } from './SearchableSelect';

const options = countryCodes.countries
  .map(({ country: label, fips: value }) => ({ label, value }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function CountrySelect(props: SearchableSelectProps) {
  return <SearchableSelect options={options} {...props} />;
}

// See comment about prop types on SearchableSelect.

export default CountrySelect;
