import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { CONTRIBUTION_INTERVALS } from 'constants/contributionIntervals';
import { cleanup, fireEvent, render, screen, within } from 'test-utils';
import { DonationPageContext, UsePageProps } from '../DonationPage';
import DAmount, { DAmountProps } from './DAmount';

jest.mock('./PayFeesControl');

const defaultPage = {
  currency: { code: 'mock-currency-code', symbol: 'mock-currency-symbol' },
  elements: [],
  revenue_program: { name: 'mock-rp-name' },
  payment_provider: {
    stripe_account_id: 'mock-stripe-account-id'
  }
} as any;

const defaultOptions = { [CONTRIBUTION_INTERVALS.ONE_TIME]: [1, 2, 3] };

const element = {
  content: { options: defaultOptions },
  uuid: 'mock-uuid',
  type: 'DAmount'
};

const propsWithOtherAmount = {
  element: {
    content: { allowOther: true, options: defaultOptions },
    uuid: 'mock-uuid',
    type: 'DAmount'
  }
};

function tree(props?: Partial<DAmountProps>, pageContext?: Partial<UsePageProps>) {
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
        <DAmount element={element} {...props} />
      </ul>
    </DonationPageContext.Provider>
  );
}

describe('DAmount', () => {
  // Bear in mind that the various fields in this component signal selected
  // state through testids only, and have accessibility problems in general.

  it('displays a heading based on the frequency selected', () => {
    Object.values(CONTRIBUTION_INTERVALS).forEach((frequency) => {
      tree(undefined, { frequency });
      expect(screen.getByText(`donationPage.dAmount.label.${frequency}`)).toBeVisible();
      cleanup();
    });
  });

  it('displays a prompt', () => {
    tree();
    expect(screen.getByText('donationPage.dAmount.selectContribution')).toBeVisible();
  });

  it('displays page errors related to amount', () => {
    tree(undefined, { errors: { amount: 'mock-error', unrelated: 'should-not-appear' } });
    expect(screen.getByText('mock-error')).toBeInTheDocument();
    expect(screen.queryByText('should-not-appear')).not.toBeInTheDocument();
  });

  it('displays PayFeesControl if the first DPayment element in the page allows offering to pay fees', () => {
    tree(undefined, {
      page: { ...defaultPage, elements: [{ type: 'DPayment', content: { offerPayFees: true } }] }
    });
    expect(screen.getByTestId('mock-pay-fees-control')).toBeInTheDocument();
  });

  it("doesn't display a PayFeesControl if the first DPayment element in the page doesn't allow offering to pay fees", () => {
    tree(undefined, {
      page: { ...defaultPage, elements: [{ type: 'DPayment', content: { offerPayFees: false } }] }
    });
    expect(screen.queryByTestId('mock-pay-fees-control')).not.toBeInTheDocument();
  });

  it("doesn't display a PayFeesControl if the first DPayment element in the page doesn't have fee payment config", () => {
    tree(undefined, {
      page: { ...defaultPage, elements: [{ type: 'DPayment', content: {} }] }
    });
    expect(screen.queryByTestId('mock-pay-fees-control')).not.toBeInTheDocument();
  });

  it("doesn't display a PayFeesControl if there's no DPayment element in the page", () => {
    tree(undefined, { page: { ...defaultPage, elements: [] } });
    expect(screen.queryByTestId('mock-pay-fees-control')).not.toBeInTheDocument();
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
    expect(screen.getByTestId('mock-pay-fees-control')).toBeInTheDocument();
  });

  it('displays a div for every option for the contribution frequency set in the page', () => {
    tree(
      {
        element: {
          ...element,
          content: { options: { ...defaultOptions, [CONTRIBUTION_INTERVALS.MONTHLY]: [4, 5, 6] } }
        }
      },
      { frequency: CONTRIBUTION_INTERVALS.ONE_TIME }
    );

    const amounts = within(screen.getByTestId('d-amount-amounts'));

    expect(amounts.getByText('mock-currency-symbol1 mock-currency-code')).toBeVisible();
    expect(amounts.getByText('mock-currency-symbol2 mock-currency-code')).toBeVisible();
    expect(amounts.getByText('mock-currency-symbol3 mock-currency-code')).toBeVisible();
    expect(amounts.queryByText('mock-currency-symbol4 mock-currency-code')).not.toBeInTheDocument();
    expect(amounts.queryByText('mock-currency-symbol5 mock-currency-code')).not.toBeInTheDocument();
    expect(amounts.queryByText('mock-currency-symbol6 mock-currency-code')).not.toBeInTheDocument();
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

  it("selects a div if it matches the page's contribution amount", () => {
    tree(undefined, { amount: 2, frequency: CONTRIBUTION_INTERVALS.ONE_TIME });
    expect(screen.getByText('mock-currency-symbol1 mock-currency-code')).toHaveAttribute('data-testid', 'amount-1');
    expect(screen.getByText('mock-currency-symbol2 mock-currency-code')).toHaveAttribute(
      'data-testid',
      'amount-2-selected'
    );
    expect(screen.getByText('mock-currency-symbol3 mock-currency-code')).toHaveAttribute('data-testid', 'amount-3');
  });

  it("selects no divs if none match the page's contribution amount", () => {
    tree(undefined, { amount: 0, frequency: CONTRIBUTION_INTERVALS.ONE_TIME });
    expect(screen.getByText('mock-currency-symbol1 mock-currency-code')).toHaveAttribute('data-testid', 'amount-1');
    expect(screen.getByText('mock-currency-symbol2 mock-currency-code')).toHaveAttribute('data-testid', 'amount-2');
    expect(screen.getByText('mock-currency-symbol3 mock-currency-code')).toHaveAttribute('data-testid', 'amount-3');
  });

  it('sets the amount when a payment option div is clicked', () => {
    const setAmount = jest.fn();

    tree(undefined, { setAmount, amount: 1, frequency: CONTRIBUTION_INTERVALS.ONE_TIME });
    expect(setAmount).not.toBeCalled();
    userEvent.click(screen.getByText('mock-currency-symbol2 mock-currency-code'));
    expect(setAmount.mock.calls).toEqual([[2]]);
    setAmount.mockClear();
    userEvent.click(screen.getByText('mock-currency-symbol3 mock-currency-code'));
    expect(setAmount.mock.calls).toEqual([[3]]);
  });

  describe('When options contains an array of strings', () => {
    it('selects correct amount', () => {
      tree(
        {
          element: {
            ...element,
            content: { options: { ...defaultOptions, [CONTRIBUTION_INTERVALS.MONTHLY]: ['11', '22', '33'] } }
          }
        },
        { amount: 22, frequency: CONTRIBUTION_INTERVALS.MONTHLY }
      );

      expect(screen.getByTestId('amount-22-selected')).toBeInTheDocument();
    });

    it('sets the amount when a payment option div is clicked', () => {
      const setAmount = jest.fn();
      tree(
        {
          element: {
            ...element,
            content: { options: { ...defaultOptions, [CONTRIBUTION_INTERVALS.MONTHLY]: ['11', '22', '33'] } }
          }
        },
        { setAmount, amount: 22, frequency: CONTRIBUTION_INTERVALS.MONTHLY }
      );
      expect(setAmount).not.toBeCalled();
      userEvent.click(screen.getByText('mock-currency-symbol11 mock-currency-code'));
      expect(setAmount.mock.calls).toEqual([[11]]);
      setAmount.mockClear();
      userEvent.click(screen.getByText('mock-currency-symbol33 mock-currency-code'));
      expect(setAmount.mock.calls).toEqual([[33]]);
    });
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
      expect(within(screen.getByTestId('amount-other')).getByText('mock-currency-symbol')).toBeVisible();
    });

    it('shows the correct label for one-time contributions', () => {
      // One-time contributions show no label, just the currency symbol.

      tree(propsWithOtherAmount, { frequency: 'one_time' });
      expect(screen.getByTestId('amount-other')).toHaveTextContent('mock-currency-symbol');
    });

    // Gist of the below is: filter out one-time frequencies since we test that
    // above, then turn each one into a separate test. Jest wants a structure
    // like this [[test arg 1, arg 2], [test arg 1, arg 2]].

    it.each(
      Object.values(CONTRIBUTION_INTERVALS)
        .filter((value) => value !== 'one_time')
        .map((value) => [value])
    )('shows the correct label for %s contributions', (frequency) => {
      tree(propsWithOtherAmount, { frequency });
      expect(
        within(screen.getByTestId('amount-other-selected')).getByText(`common.frequency.rates.${frequency}`)
      ).toBeVisible();
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

    it('sets the amount with decimal values when a user enters a numeric value into the field', () => {
      const setAmount = jest.fn();

      tree(propsWithOtherAmount, { page: defaultPage, setAmount });
      expect(setAmount).not.toBeCalled();

      // Fire a change instead of typing because we're not simulating `amount`
      // changing in context.

      fireEvent.change(screen.getByRole('textbox'), { target: { value: '123.45' } });
      expect(setAmount.mock.calls).toEqual([[123.45]]);
      expect(screen.getByRole('textbox')).toHaveValue('123.45');
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
      expect(setAmount).lastCalledWith(undefined);
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
      userEvent.click(screen.getByText('mock-currency-symbol1 mock-currency-code'));
      setAmount.mockClear();
      userEvent.click(screen.getByRole('textbox'));
      expect(screen.getByRole('textbox')).toHaveValue('');
      expect(setAmount).toBeCalledWith(undefined);
    });

    it('sets the amount to an empty string if the user enters non-numeric text', () => {
      const setAmount = jest.fn();

      tree(propsWithOtherAmount, { setAmount, page: { ...defaultPage } });
      userEvent.type(screen.getByRole('textbox'), 'abc');
      expect(setAmount).toHaveBeenLastCalledWith(undefined);
    });

    it('sets the amount to a valid dollar amount if the user types non-numeric characters or multiple decimal point', () => {
      const setAmount = jest.fn();

      tree(propsWithOtherAmount, { page: defaultPage, setAmount });
      userEvent.type(screen.getByRole('textbox'), '123.45c.67');
      expect(screen.getByRole('textbox')).toHaveValue('123.45');
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
        {
          element: {
            ...element,
            content: { allowOther: false, options: { ...defaultOptions, [CONTRIBUTION_INTERVALS.MONTHLY]: [4, 5, 6] } }
          }
        },
        { frequency: CONTRIBUTION_INTERVALS.ONE_TIME, overrideAmount: true }
      );
      expect(screen.getByRole('textbox')).toBeVisible();
    });

    it('prepopulates the other amount field with the page amount', () => {
      tree(
        {
          element: {
            ...element,
            content: { options: { ...defaultOptions, [CONTRIBUTION_INTERVALS.MONTHLY]: [4, 5, 6] } }
          }
        },
        { amount: 99, frequency: CONTRIBUTION_INTERVALS.ONE_TIME, overrideAmount: true }
      );
      expect(screen.getByRole('textbox')).toHaveValue('99');
    });

    it('allows editing the amount in the text box', () => {
      const setAmount = jest.fn();

      tree(
        {
          element: {
            ...element,
            content: { options: { ...defaultOptions, [CONTRIBUTION_INTERVALS.MONTHLY]: [4, 5, 6] } }
          }
        },
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
        {
          element: {
            ...element,
            content: { options: { ...defaultOptions, [CONTRIBUTION_INTERVALS.MONTHLY]: [4, 5, 6] } }
          }
        },
        { setAmount, amount: 99, frequency: CONTRIBUTION_INTERVALS.ONE_TIME, overrideAmount: true }
      );
      expect(setAmount).not.toHaveBeenCalled();
      userEvent.click(screen.getByText('mock-currency-symbol2 mock-currency-code'));
      expect(setAmount.mock.calls).toEqual([[2]]);
    });
  });
});
