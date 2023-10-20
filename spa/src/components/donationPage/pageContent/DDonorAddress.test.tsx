// Needed to type mockAddressComponents
/// <reference types="google.maps" />

import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { usePlacesWidget } from 'react-google-autocomplete';
import { act, render, screen } from 'test-utils';
import { HUB_GOOGLE_MAPS_API_KEY } from 'appSettings';
import { DonationPageContext, UsePageProps } from '../DonationPage';
import DDonorAddress, { DDonorAddressProps } from './DDonorAddress';
import { DonorAddressElement } from 'hooks/useContributionPage';

jest.mock('components/donationPage/DonationPage', () => ({
  ...jest.requireActual('components/donationPage/DonationPage'),
  usePage: () => ({
    ...jest.requireActual('components/donationPage/DonationPage').usePage(),
    page: {
      locale: 'mock-locale'
    }
  })
}));

jest.mock('country-code-lookup', () => ({
  countries: [
    { country: 'AAA', iso2: 'aa' },
    { country: 'BBB', iso2: 'bb' }
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

const element = { content: {}, requiredFields: [], type: 'DDonorAddress', uuid: 'mock-uuid' } as DonorAddressElement;

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
        <DDonorAddress element={element} {...props} />
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
    ['Address', 'mailing_street', false, false, 'donationPage.dDonorAddress.address'],
    ['City', 'mailing_city', false, false, 'donationPage.dDonorAddress.city'],
    ['State', 'mailing_state', false, false, 'donationPage.dDonorAddress.stateLabel.state'],
    ['Zip/Postal code', 'mailing_postal_code', true, true, 'donationPage.dDonorAddress.zip']
  ])('The %s text field', (visibleName, internalName, showZipAndCountryOnly, alwaysRequired, translationKey) => {
    it(`has the form name ${internalName}`, () => {
      tree();

      const field = screen.getByRole('textbox', { name: translationKey });

      expect(field).toBeVisible();
      expect(field).toHaveAttribute('name', internalName);
    });

    it('is required by default', () => {
      tree();
      expect(screen.getByRole('textbox', { name: translationKey })).toBeRequired();
    });

    it(`${alwaysRequired ? 'is required even' : 'is not required'} if addressOptional is true`, () => {
      tree({}, { element: { ...element, content: { addressOptional: true } } });
      expect.assertions(1);
      if (alwaysRequired) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(screen.getByRole('textbox', { name: translationKey })).toBeRequired();
      } else {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(screen.getByRole('textbox', { name: translationKey })).not.toBeRequired();
      }
    });

    it(`if zipAndCountryOnly = true -> ${showZipAndCountryOnly ? 'show' : 'hide'}`, () => {
      tree({}, { element: { ...element, content: { zipAndCountryOnly: true } } });
      expect.assertions(1);
      if (showZipAndCountryOnly) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(screen.getByRole('textbox', { name: translationKey })).toBeVisible();
      } else {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(screen.queryByRole('textbox', { name: translationKey })).not.toBeInTheDocument();
      }
    });

    it('updates when the user types into it', () => {
      tree();
      userEvent.type(screen.getByRole('textbox', { name: translationKey }), `test-${visibleName}`);
      expect(screen.getByRole('textbox', { name: translationKey })).toHaveValue(`test-${visibleName}`);
    });

    it(`displays errors keyed on ${internalName}`, () => {
      tree({ errors: { [internalName]: 'test-error' } });

      // We don't have test IDs for helper text right now.
      // eslint-disable-next-line testing-library/no-node-access
      expect(document.getElementById(`${internalName}-helper-text`)).toHaveTextContent('test-error');
    });
  });

  it(`has the show Address line 2 button`, () => {
    tree();
    expect(screen.getByRole('button', { name: 'donationPage.dDonorAddress.showLine2' })).toBeEnabled();
  });

  describe('The Line 2 address field', () => {
    function openLine2() {
      userEvent.click(screen.getByRole('button', { name: 'donationPage.dDonorAddress.showLine2' }));
    }

    it(`is hidden by default`, () => {
      tree();
      expect(screen.queryByRole('textbox', { name: 'donationPage.dDonorAddress.line2' })).not.toBeInTheDocument();
    });

    it(`has the form name mailing_complement`, () => {
      tree();
      openLine2();
      const field = screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.line2' });

      expect(field).toBeVisible();
      expect(field).toHaveAttribute('name', 'mailing_complement');
    });

    it('is not required', () => {
      tree();
      openLine2();
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.line2' })).not.toBeRequired();
    });

    it('updates when the user types into it', () => {
      tree();
      openLine2();
      userEvent.type(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.line2' }), `mock-address-line-2`);
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.line2' })).toHaveValue(
        `mock-address-line-2`
      );
    });

    it(`displays errors keyed on mailing_complement`, () => {
      tree({ errors: { mailing_complement: 'test-error' } });
      openLine2();
      // We don't have test IDs for helper text right now.
      // eslint-disable-next-line testing-library/no-node-access
      expect(document.getElementById(`mailing_complement-helper-text`)).toHaveTextContent('test-error');
    });
  });

  describe('The State field label', () => {
    it('is State by default', () => {
      tree();
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.stateLabel.state' })).toBeVisible();
    });

    it.each([
      ['State/Province', ['province'], 'donationPage.dDonorAddress.stateLabel.stateAndProvince'],
      ['State/Region', ['region'], 'donationPage.dDonorAddress.stateLabel.stateAndRegion'],
      ['State/Province/Region', ['region', 'province'], 'donationPage.dDonorAddress.stateLabel.stateProvinceAndRegion']
    ])('is %s if configured', (_, additionalStateFieldLabels, translationKey) => {
      tree({}, { element: { content: { additionalStateFieldLabels } } } as any);

      const field = screen.getByRole('textbox', { name: translationKey });

      expect(field).toBeVisible();
      expect(field).toHaveAttribute('name', 'mailing_state');
    });
  });

  describe('The Country select', () => {
    it('displays a country select that shows the mailingCountry ISO code set in context', () => {
      tree({ mailingCountry: 'aa' });
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.country' })).toHaveValue('AAA');
    });

    it('if zipAndCountryOnly = true -> show', () => {
      tree({}, { element: { ...element, content: { zipAndCountryOnly: true } } });
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.country' })).toBeInTheDocument();
    });

    it('is required by default', () => {
      tree();
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.country' })).toBeRequired();
    });

    it('is required even if addressOptional is true', () => {
      tree({}, { element: { ...element, content: { addressOptional: true } } });
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.country' })).toBeRequired();
    });

    it('updates the country ISO code in context when the user selects a country', () => {
      const setMailingCountry = jest.fn();

      tree({ setMailingCountry });
      userEvent.click(screen.getByLabelText('Open'));
      expect(setMailingCountry).not.toBeCalled();
      userEvent.click(screen.getByText('BBB'));
      expect(setMailingCountry.mock.calls).toEqual([['bb']]);
    });
  });

  describe('Google location autocomplete', () => {
    it('initializes autocomplete with the API key and language in config', () => {
      tree();
      expect(usePlacesWidget).toBeCalledWith(
        expect.objectContaining({ apiKey: HUB_GOOGLE_MAPS_API_KEY, language: 'mock-locale' })
      );
    });

    it('updates fields when a place is selected', () => {
      const city = mockAddressComponents.find(({ types }) => types.includes('locality'))!.long_name;
      const state = mockAddressComponents.find(({ types }) => types.includes('administrative_area_level_1'))!.long_name;
      const streetNumber = mockAddressComponents.find(({ types }) => types.includes('street_number'))!.long_name;
      const street = mockAddressComponents.find(({ types }) => types.includes('route'))!.long_name;
      const zip = mockAddressComponents.find(({ types }) => types.includes('postal_code'))!.long_name;

      tree();
      act(() => usePlacesWidgetMock.mock.calls[0][0].onPlaceSelected({ address_components: mockAddressComponents }));
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.address' })).toHaveValue(
        `${streetNumber} ${street}`
      );
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.city' })).toHaveValue(city);
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.stateLabel.state' })).toHaveValue(state);
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.zip' })).toHaveValue(zip);
      // TODO: country field in DEV-2691
    });

    it("does nothing if the address can't be autocompleted", () => {
      tree();
      usePlacesWidgetMock.mock.calls[0][0].onPlaceSelected({ address_components: undefined });
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.address' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.city' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.stateLabel.state' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.zip' })).toHaveValue('');
      // TODO: country field in DEV-2691
    });

    it("defaults fields that don't appear in the API response to empty strings", async () => {
      tree();
      act(() =>
        usePlacesWidgetMock.mock.calls[0][0].onPlaceSelected({
          address_components: [
            {
              long_name: '12345',
              short_name: '12345',
              types: ['postal_code']
            }
          ]
        })
      );
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.address' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.city' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.stateLabel.state' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.zip' })).toHaveValue('12345');
      // TODO: country field in DEV-2691
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
