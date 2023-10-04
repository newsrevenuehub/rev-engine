import { axe } from 'jest-axe';
import { fireEvent, render, screen, within } from 'test-utils';
import { DonationPageContext, UsePageProps } from '../DonationPage';
import DSwag, { DSwagProps } from './DSwag';
import { CONTRIBUTION_INTERVALS } from 'constants/contributionIntervals';
import { cleanSwagValue } from 'utilities/swagValue';

// Mock the MUI select into a native <select>. We only use the select form of it
// in DSwag, so we don't need to mock the editable version.

jest.mock('components/base', () => ({
  ...jest.requireActual('components/base'),
  MenuItem: (props: any) => <option value={props.value}>{props.children}</option>,
  TextField: (props: any) => (
    <>
      <label htmlFor={props.id}>{props.label}</label>
      <select disabled={props.disabled} id={props.id} name={props.name} required={props.required}>
        {props.children}
      </select>
    </>
  )
}));

const defaultPage = {
  currency: { code: 'mock-currency-code', symbol: 'mock-currency-symbol' },
  elements: [],
  revenue_program: { name: 'mock-rp-name' },
  payment_provider: {
    stripe_account_id: 'mock-stripe-account-id'
  }
} as any;

const defaultElement = {
  content: {
    swags: [
      {
        swagName: 'mock-swag-name',
        // Third option is to test that other forbidden characters are handled
        // correctly.
        swagOptions: ['mock-option-1', 'mock-option-2', 'mock option 3!']
      }
    ],
    swagThreshold: 123.45
  },
  requiredFields: [],
  type: 'DSwag',
  uuid: 'mock-uuid'
} as any;

function tree(props?: Partial<DSwagProps>, pageContext?: Partial<UsePageProps>) {
  return render(
    <DonationPageContext.Provider
      value={
        {
          amount: 1,
          frequency: CONTRIBUTION_INTERVALS.ONE_TIME,
          errors: {},
          page: defaultPage,
          overrideAmount: false,
          feeAmount: 0.5,
          setAmount: () => {},
          setUserAgreesToPayFees: () => {},
          stripeClientSecret: 'mock-stripe-client-secret',
          userAgreesToPayFees: false,
          ...pageContext
        } as any
      }
    >
      <ul>
        <DSwag element={defaultElement} {...props} />
      </ul>
    </DonationPageContext.Provider>
  );
}

describe('DSwag', () => {
  const getOptOutCheckbox = () => screen.getByRole('checkbox', { name: 'donationPage.dSwag.maximizeContribution' });

  describe('When showOptOutOnly is undefined in element content', () => {
    it('displays the contribution threshold', () => {
      tree();

      // Have to select by text because the checkbox itself is not visible.

      expect(
        screen.getByText(
          'donationPage.dSwag.giveXToBeEligible{"amount":"mock-currency-symbol123.45 mock-currency-code"}'
        )
      ).toBeVisible();
    });

    describe('When the threshold has been met', () => {
      it('shows an opt-out checkbox with name swag_opt_out', () => {
        tree(undefined, { amount: 124 });
        expect(getOptOutCheckbox()).toBeInTheDocument();
      });

      it('unchecks the opt-out checkbox by default', () => {
        tree(undefined, { amount: 124 });
        expect(getOptOutCheckbox()).not.toBeChecked();
      });

      it('shows a required menu named swag_choices with appropriate options', () => {
        tree(undefined, { amount: 124 });

        const menu = screen.getByRole('combobox', { name: 'mock-swag-name' });

        expect(menu).toBeVisible();
        expect(menu).toBeRequired();

        const options = within(menu).getAllByRole('option');

        expect(options.length).toBe(defaultElement.content.swags[0].swagOptions.length);
        options.forEach((option, index) => {
          const optionText = defaultElement.content.swags[0].swagOptions[index];

          // Underscores in mock_swag_name are because it needs to be cleaned for
          // the API.

          expect(option).toHaveAttribute('value', `mock_swag_name:${cleanSwagValue(optionText)}`);
          expect(option).toHaveTextContent(optionText);
        });
      });

      it('enables the option menu by default', () => {
        tree(undefined, { amount: 124 });
        expect(screen.getByRole('combobox', { name: 'mock-swag-name' })).toBeEnabled();
      });

      it('disables the option menu, clears its value, and removes its name if the opt-out checkbox is checked', () => {
        tree(undefined, { amount: 124 });

        const select = screen.getByRole('combobox', { name: 'mock-swag-name' });

        fireEvent.change(select, { target: { value: 'mock_swag_name:mock_option_1' } });
        expect(select).toBeEnabled();
        expect(select).toHaveValue('mock_swag_name:mock_option_1');
        expect(select).toHaveAttribute('name');
        fireEvent.click(getOptOutCheckbox());
        expect(select).toBeDisabled();
        expect(select).toHaveValue(undefined);
        expect(select).not.toHaveAttribute('name');
      });

      describe('When the element content asks for the opt-out checkbox to be checked by default', () => {
        it('checks the opt-out checkbox if element content asks for it to default checked', () => {
          tree(
            { element: { ...defaultElement, content: { ...defaultElement.content, optOutDefault: true } } },
            { amount: 124 }
          );
          expect(getOptOutCheckbox()).toBeChecked();
        });

        it('disables the option menu, clears its value, and gives it no name', () => {
          tree(
            { element: { ...defaultElement, content: { ...defaultElement.content, optOutDefault: true } } },
            { amount: 124 }
          );

          const select = screen.getByRole('combobox', { name: 'mock-swag-name' });

          expect(select).toBeDisabled();
          expect(select).toHaveValue(undefined);
          expect(select).not.toHaveAttribute('name');
        });
      });
    });

    describe('When the threshold has not been met', () => {
      it("doesn't show the opt-out checkbox", () => {
        tree(undefined, { amount: 0 });
        expect(
          screen.queryByRole('checkbox', {
            name: "Maximize my contribution–I'd rather not receive member merchandise."
          })
        ).not.toBeInTheDocument();
      });

      it("doesn't show the menu of swag choices", () => {
        tree(undefined, { amount: 0 });
        expect(screen.queryByRole('menu', { name: 'mock-swag-name' })).not.toBeInTheDocument();
      });
    });

    describe('When no swag choices have been configured', () => {
      it('displays nothing if the page is live', () => {
        tree({
          element: {
            ...defaultElement,
            content: {
              swags: [
                {
                  swagName: 'mock-swag-name',
                  swagOptions: []
                }
              ],
              swagThreshold: 123.45
            }
          },
          live: true
        });
        expect(document.body).toHaveTextContent('');
      });

      it("displays the threshold if the page isn't live", () => {
        tree({
          element: {
            ...defaultElement,
            content: {
              swags: [
                {
                  swagName: 'mock-swag-name',
                  swagOptions: []
                }
              ],
              swagThreshold: 123.45
            }
          },
          live: false
        });
        expect(
          screen.getByText(
            'Give a total of mock-currency-symbol123.45 mock-currency-code / year or more to be eligible'
          )
        ).toBeVisible();
      });
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When showOptOutOnly is set in element content', () => {
    function treeWithOptOutOnly() {
      return tree({ element: { ...defaultElement, content: { ...defaultElement.content, showOptOutOnly: true } } });
    }

    it('shows the opt-out checkbox with the correct name even if the contribution is below the threshold', () => {
      treeWithOptOutOnly();

      const checkbox = getOptOutCheckbox();

      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('name', 'swag_opt_out');
    });

    it('gives the opt-out checkbox the correct value when checked', () => {
      treeWithOptOutOnly();

      const checkbox = getOptOutCheckbox();

      fireEvent.change(checkbox, { target: { checked: true } });
      expect(checkbox).toHaveAttribute('value', 'true');
    });

    it('unchecks the opt-out checkbox by default', () => {
      treeWithOptOutOnly();
      expect(getOptOutCheckbox()).not.toBeChecked();
    });

    it("doesn't show the threshold amount", () => {
      treeWithOptOutOnly();
      expect(screen.queryByText('Give a total', { exact: false })).not.toBeInTheDocument();
    });

    it("doesn't show the swag options menu", () => {
      treeWithOptOutOnly();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = treeWithOptOutOnly();

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
