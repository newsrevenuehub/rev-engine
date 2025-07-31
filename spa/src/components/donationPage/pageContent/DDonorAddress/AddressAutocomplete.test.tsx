import { AutocompleteProps } from '@material-ui/lab';
import { axe } from 'jest-axe';
import useGoogleMaps from 'hooks/useGoogleMaps';
import { act, fireEvent, render, screen, waitFor, within } from 'test-utils';
import AddressAutocomplete, { AddressAutocompleteProps } from './AddressAutocomplete';

jest.mock('hooks/useGoogleMaps');

// Mocking Autocomplete because it seems impossible to simulate the appearance
// of the autocomplete options in React Testing Library. Closest I got was
// displaying an empty popover.

jest.mock('@material-ui/lab', () => ({
  ...jest.requireActual('@material-ui/lab'),
  Autocomplete(props: AutocompleteProps<google.maps.places.AutocompleteSuggestion, false, true, true>) {
    return (
      <div data-testid="mock-autocomplete">
        {props.renderInput({
          id: props.id!,
          value: props.inputValue
        } as any)}
        {props.options.map((option, index) => (
          <div data-testid="mock-autocomplete-option" key={index}>
            {props.getOptionLabel?.(option)}
            <button data-testid="select" onClick={() => props.onChange?.({} as any, option, 'select-option')}>
              select
            </button>
          </div>
        ))}
      </div>
    );
  }
}));

const addressComponents: google.maps.places.AddressComponent[] = [
  {
    longText: 'test-city',
    shortText: 'unused',
    types: ['locality']
  },
  {
    longText: 'unused',
    shortText: 'test-country',
    types: ['country']
  },
  {
    longText: 'test-state',
    shortText: 'unused',
    types: ['administrative_area_level_1']
  },
  {
    longText: 'test-zip',
    shortText: 'unused',
    types: ['postal_code']
  }
];

function tree(props?: Partial<AddressAutocompleteProps>) {
  return render(
    <AddressAutocomplete id="test-label" label="test-label" onSelectPlace={jest.fn()} value="test-value" {...props} />
  );
}

describe('AddressAutocomplete', () => {
  const useGoogleMapsMock = jest.mocked(useGoogleMaps);
  let fetchAutocompleteSuggestions: jest.Mock;

  beforeEach(() => {
    fetchAutocompleteSuggestions = jest.fn().mockResolvedValue({ suggestions: [] });
    useGoogleMapsMock.mockReturnValue({ error: undefined, loading: false });
    (window as any).google = {
      maps: {
        places: {
          AutocompleteSuggestion: { fetchAutocompleteSuggestions }
        }
      }
    };
  });

  afterEach(() => {
    delete (window as any).google;
  });

  // await act(() => Promise.resolve()); below is to let pending updates (e.g.
  // querying the Google Maps API mock) complete before the test is torn down.

  it('displays a text field with its name, id, and value props', async () => {
    tree({ label: 'test-label', name: 'test-name', value: 'test-value' });

    const field = screen.getByRole('textbox', { name: 'test-label' });

    expect(field).toHaveAttribute('name', 'test-name');
    expect(field).toHaveValue('test-value');
    await act(() => Promise.resolve());
  });

  it('disables browser autofill when the field is focused', async () => {
    tree();
    fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.getByRole('textbox')).toHaveAttribute('autocomplete', 'new-password');
    await act(() => Promise.resolve());
  });

  it('disables browser autofill when the field is blurred', async () => {
    tree();
    fireEvent.blur(screen.getByRole('textbox'));
    expect(screen.getByRole('textbox')).toHaveAttribute('autocomplete', '');
    await act(() => Promise.resolve());
  });

  it('calls onChange when the user types into the field', async () => {
    const onChange = jest.fn();

    tree({ onChange });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test-change' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    await act(() => Promise.resolve());
  });

  it("doesn't fetch suggestions from the Google Maps API if the value is empty", async () => {
    tree({ value: '' });
    await act(() => Promise.resolve());
    expect(window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions).not.toHaveBeenCalled();
  });

  it("doesn't fetch suggestions if the API is loading", async () => {
    useGoogleMapsMock.mockReturnValue({ error: undefined, loading: true });
    tree({ value: 'test-value' });
    await act(() => Promise.resolve());
    expect(window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions).not.toHaveBeenCalled();
  });

  it("doesn't fetch suggestions if the API had a problem loading", async () => {
    useGoogleMapsMock.mockReturnValue({ error: new Error(), loading: false });
    tree({ value: 'test-value' });
    await act(() => Promise.resolve());
    expect(window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions).not.toHaveBeenCalled();
  });

  it("doesn't fetch suggestions if the API loaded, but the google global is undefined", async () => {
    delete (window as any).google.maps.places;
    expect(() => tree({ value: 'test-value' })).not.toThrow();
    // We can't test that the fetch wasn't called since it was deleted.
  });

  it('fetches suggestions and displays them based on the value of the field', async () => {
    fetchAutocompleteSuggestions.mockResolvedValue({
      suggestions: [
        { placePrediction: { text: { text: 'suggestion-1' } } },
        { placePrediction: { text: { text: 'suggestion-2' } } }
      ]
    });
    tree({ value: 'entered-value' });
    expect(fetchAutocompleteSuggestions.mock.calls).toEqual([
      [{ includedPrimaryTypes: ['street_address'], input: 'entered-value' }]
    ]);

    const options = await screen.findAllByTestId('mock-autocomplete-option');

    expect(options.length).toBe(2);
    expect(screen.getByText('suggestion-1')).toBeInTheDocument();
    expect(screen.getByText('suggestion-2')).toBeInTheDocument();
  });

  it('ignores suggestions without place predictions', async () => {
    fetchAutocompleteSuggestions.mockResolvedValue({
      suggestions: [{ placePrediction: { text: { text: 'suggestion-1' } } }, {}]
    });
    tree({ value: 'entered-value' });
    expect(fetchAutocompleteSuggestions.mock.calls).toEqual([
      [{ includedPrimaryTypes: ['street_address'], input: 'entered-value' }]
    ]);

    const options = await screen.findAllByTestId('mock-autocomplete-option');

    expect(options.length).toBe(1);
    expect(screen.getByText('suggestion-1')).toBeInTheDocument();
  });

  it('logs an error when fetching suggestions fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    fetchAutocompleteSuggestions.mockRejectedValue(new Error());
    tree({ value: 'entered-value' });
    expect(fetchAutocompleteSuggestions).toBeCalledTimes(1);
    await act(() => Promise.resolve());
    expect(errorSpy).toBeCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('calls onSelectPlace when the user chooses a suggestion', async () => {
    const onSelectPlace = jest.fn();

    fetchAutocompleteSuggestions.mockResolvedValue({
      suggestions: [
        {
          placePrediction: {
            toPlace: () => ({
              async fetchFields() {
                (this as any).addressComponents = [
                  ...addressComponents,
                  {
                    longText: 'test-street-address',
                    types: ['street_address']
                  }
                ];
              }
            }),
            text: {
              text: 'test-prediction'
            }
          }
        }
      ]
    });
    tree({ onSelectPlace });
    await screen.findAllByTestId('mock-autocomplete-option');
    expect(onSelectPlace).not.toBeCalled();
    fireEvent.click(within(screen.getByTestId('mock-autocomplete-option')).getByRole('button'));
    await waitFor(() => expect(onSelectPlace).toHaveBeenCalled());
    expect(onSelectPlace.mock.calls).toEqual([
      [
        {
          address: 'test-street-address',
          city: 'test-city',
          countryIsoCode: 'test-country',
          state: 'test-state',
          zip: 'test-zip'
        }
      ]
    ]);
  });

  it("falls back to street_number and route if street_address isn't available for the place", async () => {
    const onSelectPlace = jest.fn();

    fetchAutocompleteSuggestions.mockResolvedValue({
      suggestions: [
        {
          placePrediction: {
            toPlace: () => ({
              async fetchFields() {
                (this as any).addressComponents = [
                  ...addressComponents,
                  {
                    longText: 'test-street-number',
                    types: ['street_number']
                  },
                  {
                    longText: 'test-route',
                    types: ['route']
                  }
                ];
              }
            }),
            text: {
              text: 'test-prediction'
            }
          }
        }
      ]
    });
    tree({ onSelectPlace });
    await screen.findAllByTestId('mock-autocomplete-option');
    expect(onSelectPlace).not.toBeCalled();
    fireEvent.click(within(screen.getByTestId('mock-autocomplete-option')).getByRole('button'));
    await waitFor(() => expect(onSelectPlace).toHaveBeenCalled());
    expect(onSelectPlace.mock.calls).toEqual([
      [
        {
          address: 'test-street-number test-route',
          city: 'test-city',
          countryIsoCode: 'test-country',
          state: 'test-state',
          zip: 'test-zip'
        }
      ]
    ]);
  });

  it("calls onSelectPlace with empty strings for fields it can't find place fields for", async () => {
    const onSelectPlace = jest.fn();

    fetchAutocompleteSuggestions.mockResolvedValue({
      suggestions: [
        {
          placePrediction: {
            toPlace: () => ({
              async fetchFields() {
                (this as any).addressComponents = [];
              }
            }),
            text: {
              text: 'test-prediction'
            }
          }
        }
      ]
    });
    tree({ onSelectPlace });
    await screen.findAllByTestId('mock-autocomplete-option');
    expect(onSelectPlace).not.toBeCalled();
    fireEvent.click(within(screen.getByTestId('mock-autocomplete-option')).getByRole('button'));
    await waitFor(() => expect(onSelectPlace).toHaveBeenCalled());
    expect(onSelectPlace.mock.calls).toEqual([
      [
        {
          address: '',
          city: '',
          countryIsoCode: '',
          state: '',
          zip: ''
        }
      ]
    ]);
  });

  it('logs an error if resolving a suggestion to a place fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    fetchAutocompleteSuggestions.mockResolvedValue({
      suggestions: [
        {
          placePrediction: {
            toPlace: () => false,
            text: {
              text: 'test-prediction'
            }
          }
        }
      ]
    });
    tree();
    await screen.findAllByTestId('mock-autocomplete-option');
    fireEvent.click(within(screen.getByTestId('mock-autocomplete-option')).getByRole('button'));
    expect(errorSpy).toBeCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('logs an error if fetching fields for a place fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    fetchAutocompleteSuggestions.mockResolvedValue({
      suggestions: [
        {
          placePrediction: {
            toPlace: () => ({
              async fetchFields() {
                throw new Error();
              }
            }),
            text: {
              text: 'test-prediction'
            }
          }
        }
      ]
    });
    tree();
    await screen.findAllByTestId('mock-autocomplete-option');
    fireEvent.click(within(screen.getByTestId('mock-autocomplete-option')).getByRole('button'));
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(errorSpy).toBeCalledTimes(1);
    errorSpy.mockRestore();
  });

  it("logs an error if fetching fields succeeds but doesn't actually set fields", async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    fetchAutocompleteSuggestions.mockResolvedValue({
      suggestions: [
        {
          placePrediction: {
            toPlace: () => ({
              async fetchFields() {}
            }),
            text: {
              text: 'test-prediction'
            }
          }
        }
      ]
    });
    tree();
    await screen.findAllByTestId('mock-autocomplete-option');
    fireEvent.click(within(screen.getByTestId('mock-autocomplete-option')).getByRole('button'));
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(errorSpy).toBeCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('is accessible', async () => {
    const { container } = tree();

    await act(() => Promise.resolve());
    expect(await axe(container)).toHaveNoViolations();
  });
});
