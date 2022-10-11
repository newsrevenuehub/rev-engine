import { axe } from 'jest-axe';
import { cleanup, fireEvent, render, screen } from 'test-utils';
import { DonationPageContext } from '../DonationPage';
import DAmount from './DAmount';
import { CONTRIBUTION_INTERVALS } from 'constants/contributionIntervals';
import { getFrequencyAdjective, getFrequencyRate } from 'utilities/parseFrequency';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/react';

jest.mock('./DPayment', () => ({
  ...jest.requireActual('./DPayment'),
  PayFeesWidget: () => <div data-testid="mock-pay-fees-widget" />
}));

const defaultPage = {
  currency: { symbol: 'mock-currency-symbol' },
  elements: []
};

const defaultOptions = { [CONTRIBUTION_INTERVALS.ONE_TIME]: [1, 2, 3] };

const propsWithOtherAmount = {
  element: {
    content: { allowOther: true, options: defaultOptions },
    uuid: 'mock-uuid',
    type: 'DAmount'
  }
};

function tree(props, pageContext) {
  return render(
    <DonationPageContext.Provider value={{ amount: '', errors: {}, page: defaultPage, ...pageContext }}>
      <ul>
        <DAmount
          element={{
            content: { options: defaultOptions },
            uuid: 'mock-uuid',
            type: 'DAmount'
          }}
          {...props}
        />
      </ul>
    </DonationPageContext.Provider>
  );
}

describe('DAmount', () => {
  // Bear in mind that the various fields in this component signal selected
  // state through testids only, and have accessibility problems in general.

  it('displays a heading based on the frequency selected', () => {
    for (const interval in CONTRIBUTION_INTERVALS) {
      const frequency = CONTRIBUTION_INTERVALS[interval];

      tree(undefined, { frequency });
      expect(screen.getByText(`${getFrequencyAdjective(frequency)} amount`)).toBeVisible();
      cleanup();
    }
  });

  it('displays a prompt', () => {
    tree();
    expect(screen.getByText("Select how much you'd like to contribute")).toBeVisible();
  });

  it('displays page errors related to amount', () => {
    tree(undefined, { errors: { amount: 'mock-error', unrelated: 'should-not-appear' } });
    expect(screen.getByText('mock-error')).toBeInTheDocument();
    expect(screen.queryByText('should-not-appear')).not.toBeInTheDocument();
  });

  it('displays PayFeesWidget if the first DPayment element in the page allows offering to pay fees', () => {
    tree(undefined, {
      page: { ...defaultPage, elements: [{ type: 'DPayment', content: { offerPayFees: true } }] }
    });
    expect(screen.getByTestId('mock-pay-fees-widget')).toBeInTheDocument();
  });

  it("doesn't display a PayFeesWidget if the first DPayment element in the page doesn't allow offering to pay fees", () => {
    tree(undefined, {
      page: { ...defaultPage, elements: [{ type: 'DPayment', content: { offerPayFees: false } }] }
    });
    expect(screen.queryByTestId('mock-pay-fees-widget')).not.toBeInTheDocument();
  });

  it("doesn't display a PayFeesWidget if the first DPayment element in the page doesn't have fee payment config", () => {
    tree(undefined, {
      page: { ...defaultPage, elements: [{ type: 'DPayment', content: {} }] }
    });
    expect(screen.queryByTestId('mock-pay-fees-widget')).not.toBeInTheDocument();
  });

  it("doesn't display a PayFeesWidget if there's no DPayment element in the page", () => {
    tree(undefined, { page: { ...defaultPage, elements: [] } });
    expect(screen.queryByTestId('mock-pay-fees-widget')).not.toBeInTheDocument();
  });

  it('ignores any DPayment elements after the first', () => {
    tree(undefined, {
      page: {
        ...defaultPage,
        elements: [
          { type: 'DPayment', content: { offerPayFees: true } },
          { type: 'DPayment', content: { offerPayFees: false } }
        ]
      }
    });
    expect(screen.getByTestId('mock-pay-fees-widget')).toBeInTheDocument();
  });

  it('displays a div for every option for the contribution frequency set in the page', () => {
    tree(
      { options: { ...defaultOptions, [CONTRIBUTION_INTERVALS.MONTHLY]: [4, 5, 6] } },
      { frequency: CONTRIBUTION_INTERVALS.ONE_TIME }
    );

    const amounts = within(screen.getByTestId('d-amount-amounts'));

    expect(amounts.getByText('mock-currency-symbol1')).toBeVisible();
    expect(amounts.getByText('mock-currency-symbol2')).toBeVisible();
    expect(amounts.getByText('mock-currency-symbol3')).toBeVisible();
    expect(amounts.queryByText('mock-currency-symbol4')).not.toBeInTheDocument();
    expect(amounts.queryByText('mock-currency-symbol5')).not.toBeInTheDocument();
    expect(amounts.queryByText('mock-currency-symbol6')).not.toBeInTheDocument();
  });

  it('displays no divs if the element is missing options configuration', () => {
    // This triggers a console error due to prop types.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    tree(
      { element: { content: { options: undefined }, type: 'DAmount', uuid: 'mock-uuid' } },
      { frequency: CONTRIBUTION_INTERVALS.ONE_TIME }
    );

    expect(screen.getByTestId('d-amount-amounts')).toHaveTextContent('');
    errorSpy.mockRestore();
  });

  it("selects a div if it matches the page's donation amount", () => {
    tree({ options: defaultOptions }, { amount: 2, frequency: CONTRIBUTION_INTERVALS.ONE_TIME });
    expect(screen.getByText('mock-currency-symbol1')).toHaveAttribute('data-testid', 'amount-1');
    expect(screen.getByText('mock-currency-symbol2')).toHaveAttribute('data-testid', 'amount-2-selected');
    expect(screen.getByText('mock-currency-symbol3')).toHaveAttribute('data-testid', 'amount-3');
  });

  it("selects no divs if none match the page's donation amount", () => {
    tree({ options: defaultOptions }, { amount: 0, frequency: CONTRIBUTION_INTERVALS.ONE_TIME });
    expect(screen.getByText('mock-currency-symbol1')).toHaveAttribute('data-testid', 'amount-1');
    expect(screen.getByText('mock-currency-symbol2')).toHaveAttribute('data-testid', 'amount-2');
    expect(screen.getByText('mock-currency-symbol3')).toHaveAttribute('data-testid', 'amount-3');
  });

  it('sets the amount when a payment option div is clicked', () => {
    const setAmount = jest.fn();

    tree({ options: defaultOptions }, { setAmount, amount: 1, frequency: CONTRIBUTION_INTERVALS.ONE_TIME });
    expect(setAmount).not.toBeCalled();
    userEvent.click(screen.getByText('mock-currency-symbol2'));
    expect(setAmount.mock.calls).toEqual([[2]]);
    setAmount.mockClear();
    userEvent.click(screen.getByText('mock-currency-symbol3'));
    expect(setAmount.mock.calls).toEqual([[3]]);
  });

  it('does not show a field where the user can enter an amount', () => {
    tree();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });

  describe('when the element has the allowOther option set', () => {
    it('displays a field where the user can enter another amount', () => {
      tree(propsWithOtherAmount);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it("selects the field if the amount set in the page doesn't match any payment options", () => {
      tree(propsWithOtherAmount, { amount: 999, frequency: CONTRIBUTION_INTERVALS.ONE_TIME });
      expect(screen.getByTestId('amount-other-selected')).toBeInTheDocument();
    });

    it('does not select the field if the amount set in the page matches a payment option', () => {
      tree(propsWithOtherAmount, { amount: 1, frequency: CONTRIBUTION_INTERVALS.ONE_TIME });
      expect(screen.queryByTestId('amount-other-selected')).not.toBeInTheDocument();
    });

    it('shows the page currency symbol next to the text field', () => {
      tree(propsWithOtherAmount);
      expect(within(screen.getByTestId('amount-other-selected')).getByText('mock-currency-symbol')).toBeVisible();
    });

    it('shows the correct label for the frequency in the page', () => {
      for (const interval in CONTRIBUTION_INTERVALS) {
        const frequency = CONTRIBUTION_INTERVALS[interval];

        tree(propsWithOtherAmount, { frequency });

        // One-time contributions show no label, just the currency symbol.

        if (interval === 'ONE_TIME') {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(screen.getByTestId('amount-other-selected')).toHaveTextContent('mock-currency-symbol');
        } else {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(
            within(screen.getByTestId('amount-other-selected')).getByText(getFrequencyRate(frequency))
          ).toBeVisible();
        }

        cleanup();
      }
    });

    it('sets the amount when a user enters a numeric value into the field', () => {
      const setAmount = jest.fn();

      tree(propsWithOtherAmount, { page: defaultPage, setAmount });
      expect(setAmount).not.toBeCalled();

      // Fire a change instead of typing because we're not simulating `amount`
      // changing in context.

      fireEvent.change(screen.getByRole('textbox'), { target: { value: '123' } });
      expect(setAmount.mock.calls).toEqual([[123]]);
      expect(screen.getByRole('textbox')).toHaveValue('123');
    });

    it("doesn't select an amount option if the user enters a number corresponding to that option", () => {
      const setAmount = jest.fn();

      // We're mocking context *after* the change event below.

      const pageContext = {
        amount: 1,
        setAmount,
        frequency: CONTRIBUTION_INTERVALS.ONE_TIME,
        page: defaultPage
      };

      tree(propsWithOtherAmount, pageContext);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '1' } });
      expect(screen.getByRole('textbox')).toHaveValue('1');
      expect(screen.queryByTestId('amount-1-selected')).not.toBeInTheDocument();
    });

    it('sets the amount to an empty string if the user clears the field', () => {
      const setAmount = jest.fn();

      tree(propsWithOtherAmount, { page: defaultPage, setAmount });
      userEvent.type(screen.getByRole('textbox'), '123');
      setAmount.mockClear();
      userEvent.clear(screen.getByRole('textbox'));
      expect(setAmount).lastCalledWith('');
    });

    it("preserves the field's value if the user clicks away from it and then re-focuses it", () => {
      const setAmount = jest.fn();

      tree(propsWithOtherAmount, { page: defaultPage, setAmount });
      userEvent.type(screen.getByRole('textbox'), '123');
      userEvent.click(document.body);
      userEvent.click(screen.getByRole('textbox'));
      expect(screen.getByRole('textbox')).toHaveValue('123');
    });

    it('sets the amount to an empty string if the user selects a button, then focuses the field', () => {
      const setAmount = jest.fn();

      tree(propsWithOtherAmount, {
        setAmount,
        amount: 1,
        page: { ...defaultPage, elements: [propsWithOtherAmount.element] },
        frequency: CONTRIBUTION_INTERVALS.ONE_TIME
      });
      userEvent.click(screen.getByText('mock-currency-symbol1'));
      setAmount.mockClear();
      userEvent.click(screen.getByRole('textbox'));
      expect(screen.getByRole('textbox')).toHaveValue('');
      expect(setAmount).toBeCalledWith('');
    });

    it('sets the amount to an empty string if the user enters non-numeric text', () => {
      const setAmount = jest.fn();

      tree(propsWithOtherAmount, { setAmount, page: { ...defaultPage } });
      userEvent.type(screen.getByRole('textbox'), 'abc');
      expect(setAmount).toHaveBeenLastCalledWith('');
    });

    it('is accessible', async () => {
      const { container } = tree(propsWithOtherAmount);

      // Disabling checks for existing violations.

      expect(
        await axe(container, {
          rules: { label: { enabled: false }, list: { enabled: false } }
        })
      ).toHaveNoViolations();
    });
  });

  describe('When the page has overrideAmount set to true', () => {
    it('forces the the other amount field to be present, even if the element is not configured to use it', () => {
      tree(
        { content: { allowOther: false }, options: { ...defaultOptions, [CONTRIBUTION_INTERVALS.MONTHLY]: [4, 5, 6] } },
        { frequency: CONTRIBUTION_INTERVALS.ONE_TIME, overrideAmount: true }
      );
      expect(screen.getByRole('textbox')).toBeVisible();
    });

    it('prepopulates the other amount field with the page amount', () => {
      tree(
        { options: { ...defaultOptions, [CONTRIBUTION_INTERVALS.MONTHLY]: [4, 5, 6] } },
        { amount: 99, frequency: CONTRIBUTION_INTERVALS.ONE_TIME, overrideAmount: true }
      );
      expect(screen.getByRole('textbox')).toHaveValue('99');
    });

    it('allows editing the amount in the text box', () => {
      const setAmount = jest.fn();

      tree(
        { options: { ...defaultOptions, [CONTRIBUTION_INTERVALS.MONTHLY]: [4, 5, 6] } },
        { setAmount, amount: 99, frequency: CONTRIBUTION_INTERVALS.ONE_TIME, overrideAmount: true }
      );
      expect(setAmount).not.toHaveBeenCalled();

      // Fire a change instead of typing because we're not simulating `amount`
      // changing in context.

      fireEvent.change(screen.getByRole('textbox'), { target: { value: '123' } });
      expect(setAmount.mock.calls).toEqual([[123]]);
      expect(screen.getByRole('textbox')).toHaveValue('123');
    });

    it('allows choosing a preset amount', () => {
      const setAmount = jest.fn();

      tree(
        { options: { ...defaultOptions, [CONTRIBUTION_INTERVALS.MONTHLY]: [4, 5, 6] } },
        { setAmount, amount: 99, frequency: CONTRIBUTION_INTERVALS.ONE_TIME, overrideAmount: true }
      );
      expect(setAmount).not.toHaveBeenCalled();
      userEvent.click(screen.getByText('mock-currency-symbol2'));
      expect(setAmount.mock.calls).toEqual([[2]]);
    });
  });
});
