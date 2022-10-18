import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { getFrequencyAdverb } from 'utilities/parseFrequency';
import { DonationPageContext, UsePageProps } from '../DonationPage';
import { PayFeesWidget } from './DPayment';

const defaultPage = {
  currency: {
    symbol: 'mock-currency-symbol'
  }
};

function tree(pageContext?: Partial<UsePageProps>) {
  return render(
    <DonationPageContext.Provider
      value={{
        feeAmount: 0,
        frequency: 'one_time',
        page: defaultPage,
        setUserAgreesToPayFees: jest.fn(),
        userAgreesToPayFees: true,
        ...pageContext
      }}
    >
      <PayFeesWidget />
    </DonationPageContext.Provider>
  );
}

describe('PayFeesWidget', () => {
  // Most of these tests contain workarounds for the fact that the underlying
  // Checkbox component does not label its input properly and uses a CSS class
  // to hide itself that doesn't handle screen readers (I think).

  describe('When a fee amount is set in page context', () => {
    it('displays a checkbox with the fee amount', () => {
      tree({ feeAmount: 1, frequency: 'one_time' });
      expect(screen.getByRole('checkbox')).toBeVisible();
      expect(screen.getByText(`mock-currency-symbol1.00 ${getFrequencyAdverb('one_time')}`)).toBeVisible();
    });

    it('displays explanatory text', () => {
      tree({ feeAmount: 1, frequency: 'one_time' });
      expect(
        screen.getByText(
          'Paying the Stripe transaction fee, while not required, directs more money in support of our mission.'
        )
      ).toBeVisible();
    });

    it('checks the checkbox when the user chooses to pay fees', () => {
      tree({ feeAmount: 1, frequency: 'one_time', userAgreesToPayFees: true });
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it("doesn't check the checkbox when the user doesn't choose to pay fees", () => {
      tree({ feeAmount: 1, frequency: 'one_time', userAgreesToPayFees: false });
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('sets that the user has chosen to pay fees when the checkbox is checked', () => {
      const setUserAgreesToPayFees = jest.fn();

      tree({ setUserAgreesToPayFees, feeAmount: 1, frequency: 'one_time', userAgreesToPayFees: false });
      expect(setUserAgreesToPayFees).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox'));
      expect(setUserAgreesToPayFees.mock.calls).toEqual([[true]]);
    });

    it('sets that the user has chosen to not pay fees when the checkbox is unchecked', () => {
      const setUserAgreesToPayFees = jest.fn();

      tree({ setUserAgreesToPayFees, feeAmount: 1, frequency: 'one_time', userAgreesToPayFees: true });
      expect(setUserAgreesToPayFees).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox'));
      expect(setUserAgreesToPayFees.mock.calls).toEqual([[false]]);
    });

    it('is accessible', async () => {
      const { container } = tree({ feeAmount: 1 });

      // The underlying Checkbox component does not label its input properly.
      expect(await axe(container, { rules: { label: { enabled: false } } })).toHaveNoViolations();
    });
  });

  describe("When a fee amount isn't set in page context", () => {
    it("doesn't display a checkbox", () => {
      tree({ feeAmount: undefined, frequency: 'one_time' });
      expect(screen.getByRole('checkbox')).toHaveClass('hidden');
    });

    it('displays explanatory text', () => {
      tree({ feeAmount: undefined, frequency: 'one_time' });

      expect(
        screen.getByText(
          'Paying the Stripe transaction fee, while not required, directs more money in support of our mission.'
        )
      ).toBeVisible();
    });

    it('is accessible', async () => {
      const { container } = tree({ feeAmount: undefined });

      expect(await axe(container, { rules: { label: { enabled: false } } })).toHaveNoViolations();
    });
  });
});
