// Needed to type mockAddressComponents
/// <reference types="google.maps" />

import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { usePlacesWidget } from 'react-google-autocomplete';
import { act, render, screen } from 'test-utils';
import { HUB_GOOGLE_MAPS_API_KEY } from 'appSettings';
import { DonationPageContext, UsePageProps } from '../DonationPage';
import DDonorAddress, { DDonorAddressProps } from './DDonorAddress';

jest.mock('country-code-lookup', () => ({
  countries: [
    { country: 'AAA', fips: 'aaa' },
    { country: 'BBB', fips: 'bbb' }
  ]
}));
jest.mock('react-google-autocomplete');

// See
// https://developers.google.com/maps/documentation/javascript/geocoding#GeocodingResults
// for documentation of this type. It can also help to look at an API response
// on a live donation page.

const mockAddressComponents: google.maps.GeocoderAddressComponent[] = [
  {
    long_name: '123',
    short_name: '123',
    types: ['street_number']
  },
  {
    long_name: 'Sesame Street',
    short_name: 'Sesame St',
    types: ['route']
  },
  {
    long_name: 'New York',
    short_name: 'New York (short_name)',
    types: ['locality', 'political']
  },
  {
    long_name: 'New York City',
    short_name: 'NYC',
    types: ['administrative_area_level_2', 'political']
  },
  {
    long_name: 'New York',
    short_name: 'NY',
    types: ['administrative_area_level_1', 'political']
  },
  {
    long_name: 'United States',
    short_name: 'US',
    types: ['country', 'political']
  },
  {
    long_name: '12345',
    short_name: '12345',
    types: ['postal_code']
  }
];

function tree(pageContext?: Partial<UsePageProps>, props?: Partial<DDonorAddressProps>) {
  return render(
    <DonationPageContext.Provider
      value={
        {
          errors: {},
          mailingCountry: '',
          setMailingCountry: jest.fn(),
          ...pageContext
        } as any
      }
    >
      <ul>
        <DDonorAddress
          element={{ content: {}, requiredFields: [], type: 'DDonorAddress', uuid: 'mock-uuid' }}
          {...props}
        />
      </ul>
    </DonationPageContext.Provider>
  );
}

describe('DDonorAddress', () => {
  const usePlacesWidgetMock = usePlacesWidget as jest.Mock;

  beforeEach(() => usePlacesWidgetMock.mockReturnValue({}));
  afterEach(() => usePlacesWidgetMock.mockReset());

  // Assertions here related to form names are key because the donation page
  // component uses them to assemble the data. See the serializeForm() function
  // in stripeFns.ts.

  describe.each([
    ['Address', 'mailing_street'],
    ['City', 'mailing_city'],
    ['State', 'mailing_state'],
    ['Zip/Postal code', 'mailing_postal_code']
  ])('The %s text field', (visibleName, internalName) => {
    it(`has the form name ${internalName}`, () => {
      tree();

      const field = screen.getByRole('textbox', { name: visibleName });

      expect(field).toBeVisible();
      expect(field).toHaveAttribute('name', internalName);
    });

    it('is required', () => {
      tree();
      expect(screen.getByRole('textbox', { name: visibleName })).toBeRequired();
    });

    it('updates when the user types into it', () => {
      tree();
      userEvent.type(screen.getByRole('textbox', { name: visibleName }), `test-${visibleName}`);
      expect(screen.getByRole('textbox', { name: visibleName })).toHaveValue(`test-${visibleName}`);
    });

    it(`displays errors keyed on ${internalName}`, () => {
      tree({ errors: { [internalName]: 'test-error' } });

      // We don't have test IDs for helper text right now.
      // eslint-disable-next-line testing-library/no-node-access
      expect(document.getElementById(`${internalName}-helper-text`)).toHaveTextContent('test-error');
    });
  });

  describe('The State field label', () => {
    it('is State by default', () => {
      tree();
      expect(screen.getByRole('textbox', { name: 'State' })).toBeVisible();
    });

    it.each([
      ['State/Province', ['province']],
      ['State/Region', ['region']],
      ['State/Province/Region', ['region', 'province']]
    ])('is %s if configured', (name, additionalStateFieldLabels) => {
      tree({}, { element: { content: { additionalStateFieldLabels } } } as any);

      const field = screen.getByRole('textbox', { name });

      expect(field).toBeVisible();
      expect(field).toHaveAttribute('name', 'mailing_state');
    });
  });

  describe('The Country select', () => {
    it('displays a country select that shows the mailingCountry FIPS code set in context', () => {
      tree({ mailingCountry: 'aaa' });
      expect(screen.getByRole('textbox', { name: 'Country' })).toHaveValue('AAA');
    });

    it('updates the country FIPS code in context when the user selects a country', () => {
      const setMailingCountry = jest.fn();

      tree({ setMailingCountry });
      userEvent.click(screen.getByLabelText('Open'));
      expect(setMailingCountry).not.toBeCalled();
      userEvent.click(screen.getByText('BBB'));
      expect(setMailingCountry.mock.calls).toEqual([['bbb']]);
    });
  });

  describe('Google location autocomplete', () => {
    it('initializes autocomplete with the API key in config', () => {
      tree();
      expect(usePlacesWidget).toBeCalledWith(expect.objectContaining({ apiKey: HUB_GOOGLE_MAPS_API_KEY }));
    });

    it('updates fields when a place is selected', () => {
      const city = mockAddressComponents.find(({ types }) => types.includes('locality'))!.long_name;
      const state = mockAddressComponents.find(({ types }) => types.includes('administrative_area_level_1'))!.long_name;
      const streetNumber = mockAddressComponents.find(({ types }) => types.includes('street_number'))!.long_name;
      const street = mockAddressComponents.find(({ types }) => types.includes('route'))!.long_name;
      const zip = mockAddressComponents.find(({ types }) => types.includes('postal_code'))!.long_name;

      tree();
      act(() => usePlacesWidgetMock.mock.calls[0][0].onPlaceSelected({ address_components: mockAddressComponents }));
      expect(screen.getByRole('textbox', { name: 'Address' })).toHaveValue(`${streetNumber} ${street}`);
      expect(screen.getByRole('textbox', { name: 'City' })).toHaveValue(city);
      expect(screen.getByRole('textbox', { name: 'State' })).toHaveValue(state);
      expect(screen.getByRole('textbox', { name: 'Zip/Postal code' })).toHaveValue(zip);
      // TODO: country field in DEV-2691
    });

    it("does nothing if the address can't be autocompleted", () => {
      tree();
      usePlacesWidgetMock.mock.calls[0][0].onPlaceSelected({ address_components: undefined });
      expect(screen.getByRole('textbox', { name: 'Address' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'City' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'State' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'Zip/Postal code' })).toHaveValue('');
      // TODO: country field in DEV-2691
    });

    it("defaults fields that don't appear in the API response to empty strings", () => {
      tree();
      usePlacesWidgetMock.mock.calls[0][0].onPlaceSelected({
        address_components: [
          {
            long_name: '12345',
            short_name: '12345',
            types: ['postal_code']
          }
        ]
      });
      expect(screen.getByRole('textbox', { name: 'Address' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'City' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'State' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'Zip/Postal code' })).toHaveValue('12345');
      // TODO: country field in DEV-2691
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
