import { Autocomplete, AutocompleteChangeReason } from '@material-ui/lab';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import useGoogleMaps from 'hooks/useGoogleMaps';
import { OutlinedTextFieldProps } from '@material-ui/core';
import { TextField } from './DDonorAddress.styled';

/**
 * Data returned when the user chooses a place via Google Maps autocomplete.
 */
export interface PlaceSelection {
  address: string;
  city: string;
  countryIsoCode: string;
  state: string;
  zip: string;
}

export interface AddressAutocompleteProps extends Omit<OutlinedTextFieldProps, 'variant'> {
  onSelectPlace: (value: PlaceSelection) => void;
  value: string;
}

export function AddressAutocomplete({ id, onSelectPlace, value, ...rest }: AddressAutocompleteProps) {
  const { error: googleMapsError, loading: googleMapsLoading } = useGoogleMaps();
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    async function fetchSuggestions() {
      // Fetch suggestions for street addresses only.

      try {
        const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          includedPrimaryTypes: ['street_address'],
          input: value.toString()
        });

        // Filter out any suggestions that are missing predictions--shouldn't
        // happen under normal circumstances.

        setSuggestions(suggestions.filter((suggestion) => 'placePrediction' in suggestion));
      } catch (error) {
        // Log the error but don't do anything else, so the user can continue interacting with the page.

        console.error(`Couldn't fetch address suggestions: ${error}`);
      }
    }

    // Need this defensive coding because in some instances, there won't be an
    // error reported, but `google.maps.places` won't be defined, either.

    if (!googleMapsLoading && !googleMapsError && google.maps?.places?.AutocompleteSuggestion && value) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [googleMapsError, googleMapsLoading, value]);

  async function handleChange(
    event: ChangeEvent<unknown>,
    value: string | google.maps.places.AutocompleteSuggestion | null | undefined,
    reason: AutocompleteChangeReason
  ) {
    if (reason !== 'select-option' || typeof value !== 'object' || !value) {
      // Should never happen because of the props we set on <Autocomplete>
      // below. We'll only ever receive an AutocompleteSuggestion.
      throw new Error('Unexpected change reason or value');
    }

    // Retrieve full data for the selected suggestion.

    const place = value.placePrediction?.toPlace();

    if (!place) {
      // It's possible retrieval failed. In this case, the best we can do is
      // silently stop and let the user enter the address manually.
      console.error('Converting autocomplete suggestion to a place failed but without throwing an error');
      return;
    }

    try {
      await place.fetchFields({ fields: ['addressComponents'] });
    } catch (error) {
      console.error(`Fetching fields for place autocomplete failed: ${error}`);
      return;
    }

    if (!place.addressComponents) {
      console.error('Fetching fields for place autocomplete failed but without throwing an error');
      return;
    }

    // Google Maps gives us an array of address components in arbitrary order.
    // We map them to an object with keys for ease of use.

    const components = place.addressComponents.reduce<Record<string, google.maps.places.AddressComponent>>(
      (result, current) => {
        for (const type of current.types) {
          result[type] = current;
        }

        return result;
      },
      {}
    );

    // Do final assembly of the values. See
    // https://developers.google.com/maps/documentation/places/web-service/place-types#address-types
    // for source values.

    onSelectPlace({
      address:
        components.street_address?.longText ??
        ('street_number' in components && 'route' in components
          ? `${components.street_number?.longText} ${components.route?.longText}`
          : ''),
      city: components.locality?.longText ?? components.neighborhood?.longText ?? '',
      countryIsoCode: components.country?.shortText ?? '',
      state: components.administrative_area_level_1?.longText ?? '',
      zip: components.postal_code?.longText ?? ''
    });
  }

  // We disable browser autofill on the address field so that only Google Maps
  // suggestions appear. If the field loses focus, we re-enable it. The value
  // `new-password` is what react-google-autocomplete uses to prevent autofill
  // normally.

  function disableBrowserAutofill() {
    if (inputRef?.current) {
      inputRef.current.setAttribute('autocomplete', 'new-password');
    }
  }

  function enableBrowserAutofill() {
    if (inputRef?.current) {
      inputRef.current.setAttribute('autocomplete', '');
    }
  }

  return (
    <Autocomplete
      disableClearable
      freeSolo
      getOptionLabel={(suggestion) => suggestion.placePrediction!.text.text}
      id={id}
      onChange={handleChange}
      options={suggestions}
      inputValue={value}
      renderInput={(params) => (
        <TextField
          {...params}
          inputProps={{ ...params.inputProps, className: 'NreTextFieldInput' }}
          inputRef={inputRef}
          onBlur={enableBrowserAutofill}
          onFocus={disableBrowserAutofill}
          InputLabelProps={{
            ...params.InputLabelProps,
            classes: {
              asterisk: 'NreTextFieldInputLabelAsterisk',
              formControl: 'NreTextFieldInputLabelFormControl',
              root: 'NreTextFieldInputLabelRoot'
            }
          }}
          InputProps={{
            ...params.InputProps,
            classes: { root: 'NreTextFieldInputRoot', underline: 'NreTextFieldInputUnderline' } as any
          }}
          {...rest}
        />
      )}
    />
  );
}

export default AddressAutocomplete;
