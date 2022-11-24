import countryCodes from 'country-code-lookup';
import { useMemo } from 'react';
import { SearchableSelect, SearchableSelectProps } from './SearchableSelect';

export interface CountryOption {
  label: string;
  fipsCode: string;
}

export interface CountrySelectProps extends Omit<SearchableSelectProps<CountryOption>, 'options' | 'value'> {
  value: string;
}

const options: CountryOption[] = countryCodes.countries
  .filter(({ fips }) => fips !== '')
  .map(({ fips, country }) => ({ label: country, fipsCode: fips }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function CountrySelect(props: CountrySelectProps) {
  const { value: fipsValue, ...rest } = props;
  const selected = useMemo(() => options.find(({ fipsCode }) => fipsValue === fipsCode), [fipsValue]);

  // The cast of value to any is because we need to provide a non-undefined
  // value to keep the component controlled, but the type definition doesn't
  // allow this.

  return (
    <SearchableSelect
      getOptionLabel={({ label }: CountryOption) => label}
      options={options}
      value={selected ?? (null as any)}
      {...rest}
    />
  );
}

// See comment about prop types on SearchableSelect.

export default CountrySelect;
