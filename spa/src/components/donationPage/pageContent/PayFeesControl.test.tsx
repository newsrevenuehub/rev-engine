import { render, screen } from 'test-utils';
import { axe } from 'jest-axe';
import PayFeesControl, { PayFeesControlProps } from './PayFeesControl';
import userEvent from '@testing-library/user-event';

function tree(props?: Partial<PayFeesControlProps>) {
  return render(
    <PayFeesControl
      agreedToPayFees={false}
      currencyCode="mock-currency-code"
      currencySymbol="mock-currency-symbol"
      feeAmount={123}
      frequency="one_time"
      onChange={jest.fn()}
      revenueProgramName="mock-rp-name"
      {...props}
    />
  );
}

describe('PayFeesControl', () => {
  it('shows a header', () => {
    tree();
    expect(screen.getByRole('heading', { name: 'Agree to pay fees?' })).toBeVisible();
  });

  it.each([[true], [false]])('shows a checkbox with correct state when agreedToPayFees is %p', (value) => {
    expect.assertions(1);
    tree({ agreedToPayFees: value });

    const checkbox = screen.getByRole('checkbox');

    if (value) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(checkbox).toBeChecked();
    } else {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(checkbox).not.toBeChecked();
    }
  });

  it('calls the onChange prop when the checkbox is clicked', () => {
    const onChange = jest.fn();

    tree({ onChange, agreedToPayFees: false });
    expect(onChange).not.toBeCalled();
    userEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toBeCalledTimes(1);
    expect(onChange.mock.calls[0]).toEqual([expect.anything(), true]);
  });

  it('sets the label of the checkbox based on the fee amount, currency, frequency, and revenue program', () => {
    tree({
      currencyCode: 'USD',
      currencySymbol: '$$$',
      feeAmount: 9999,
      frequency: 'month',
      revenueProgramName: 'test-rp'
    });
    expect(
      screen.getByLabelText(
        "I agree to pay a common.frequency.adjectives.monthly transaction fee of $$$9,999.00 USD to direct more support to test-rp's mission."
      )
    ).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
