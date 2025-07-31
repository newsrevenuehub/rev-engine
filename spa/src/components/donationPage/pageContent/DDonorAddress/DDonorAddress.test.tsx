import { initialize, mockInstances } from '@googlemaps/jest-mocks';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { DonationPageContext, UsePageProps } from '../../DonationPage';
import DDonorAddress, { DDonorAddressProps } from './DDonorAddress';
import { DonorAddressElement } from 'hooks/useContributionPage';

jest.mock('./AddressAutocomplete');
jest.mock('country-code-lookup', () => ({
  countries: [
    { country: 'AAA', iso2: 'aa' },
    { country: 'BBB', iso2: 'bb' }
  ]
}));

const element = { content: {}, requiredFields: [], type: 'DDonorAddress', uuid: 'mock-uuid' } as DonorAddressElement;

function tree(pageContext?: Partial<UsePageProps>, props?: Partial<DDonorAddressProps>) {
  return render(
    <DonationPageContext.Provider
      value={
        {
          errors: {},
          mailingCountry: '',
          page: { locale: 'mock-locale' },
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
  beforeAll(initialize);
  beforeEach(() => {
    mockInstances.clearAll();
  });

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

  it('updates fields when the address field is autocompleted to a full place', () => {
    tree();
    // Values below come from the AddressAutocomplete mock.
    userEvent.click(screen.getByText('onSelectPlace'));
    expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.address' })).toHaveValue(
      'mock-selected-address'
    );
    expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.city' })).toHaveValue('mock-selected-city');
    expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.stateLabel.state' })).toHaveValue(
      'mock-selected-state'
    );
    expect(screen.getByRole('textbox', { name: 'donationPage.dDonorAddress.zip' })).toHaveValue('mock-selected-zip');
    // TODO: country field in DEV-2691
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
