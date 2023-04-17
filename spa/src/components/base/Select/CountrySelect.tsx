import countryCodes from 'country-code-lookup';
import { ChangeEvent, useMemo } from 'react';
import { AutofillProxy } from './CountrySelect.styled';
import { SearchableSelect, SearchableSelectProps } from './SearchableSelect';

export interface CountryOption {
  label: string;
  isoCode: string;
}

export interface CountrySelectProps extends Omit<SearchableSelectProps<CountryOption>, 'options' | 'value'> {
  value: string;
}

const options: CountryOption[] = countryCodes.countries
  .filter(({ iso2 }) => iso2 !== '')
  .map(({ iso2, country }) => ({ label: country, isoCode: iso2 }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function CountrySelect(props: CountrySelectProps) {
  const { value: isoValue, ...rest } = props;
  const selected = useMemo(() => options.find(({ isoCode }) => isoCode === isoValue), [isoValue]);

  // Browser autofill doesn't play well with the MUI Autocomplete component, so
  // we render a hidden text input that browsers *will* autofill. When the input
  // is changed, we compare the value entered with possible options; if any
  // match, we emit a synthetic onChange event to the consumer.
  //
  // In practice, this works with Chrome and Safari. Firefox will autofill the
  // hidden input but at least selecting "United States" as the autofilled
  // country will cause it to autofill "US" instead--probably other countries
  // have this same problem.

  function handleAutofillChange(event: ChangeEvent<HTMLInputElement>) {
    if (!rest.onChange) {
      return;
    }

    const matchedOption = options.find(({ label }) => label === event.target.value);

    if (matchedOption) {
      rest.onChange(event, matchedOption, 'select-option');
    }
  }

  // The cast of value to any is because we need to provide a non-undefined
  // value to keep the component controlled, but the type definition doesn't
  // allow this.
  //
  // The attributes on the autofill proxy are intended to make it
  // noninteractible *except* to browser autofill.

  return (
    <>
      <AutofillProxy aria-hidden>
        {rest.label}
        <input data-testid="autofill-proxy" onChange={handleAutofillChange} tabIndex={-1} type="text" />
      </AutofillProxy>
      <SearchableSelect
        getOptionLabel={({ label }: CountryOption) => label}
        options={options}
        value={selected ?? (null as any)}
        {...rest}
      />
    </>
  );
}

// See comment about prop types on SearchableSelect.

export default CountrySelect;
