import countryCodes from 'country-code-lookup';
import { SearchableSelect, SearchableSelectProps } from './SearchableSelect';

export interface CountryOption {
  label: string;
  fipsCode: string;
}

const options: CountryOption[] = countryCodes.countries
  .map(({ fips, country }) => ({ label: country, fipsCode: fips }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function CountrySelect(props: Omit<SearchableSelectProps<CountryOption>, 'options'>) {
  return <SearchableSelect getOptionLabel={({ label }: { label: string }) => label} options={options} {...props} />;
}

// See comment about prop types on SearchableSelect.

export default CountrySelect;
