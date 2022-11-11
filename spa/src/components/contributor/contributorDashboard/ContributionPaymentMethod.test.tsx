import userEvent from '@testing-library/user-event';
import { PaymentStatus } from 'constants/paymentStatus';
import { CardBrand, ContributorContribution } from 'hooks/useContributorContributionList';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ContributionPaymentMethod, { ContributionPaymentMethodProps } from './ContributionPaymentMethod';

jest.mock('./EditRecurringPaymentModal');

const testContribution: ContributorContribution = {
  amount: 123,
  card_brand: 'visa',
  created: 'mock-created-date',
  credit_card_expiration_date: 'mock-expiration-date',
  id: 'mock-id',
  interval: 'month',
  is_cancelable: true,
  is_modifiable: true,
  last4: 1234,
  last_payment_date: 'mock-last-payment-date',
  payment_type: 'mock-payment-type',
  provider_customer_id: 'mock-provider-id',
  revenue_program: 'mock-rp-slug',
  stripe_account_id: 'mock-account-id',
  status: 'paid'
};

function tree(props?: Partial<ContributionPaymentMethodProps>) {
  return render(<ContributionPaymentMethod contribution={testContribution} onUpdateComplete={jest.fn()} {...props} />);
}

function getEditDialog() {
  return screen.queryByTestId('mock-edit-recurring-payment-modal');
}

describe('ContributionPaymentMethod', () => {
  it("doesn't initially show the edit dialog", () => {
    tree();
    expect(getEditDialog()).toHaveAttribute('data-is-open', 'false');
  });

  it('displays the last four digits of the card used', () => {
    tree({ contribution: { ...testContribution, last4: 9876 } });

    // There are also placeholder dots

    expect(screen.getByText('9876', { exact: false })).toBeVisible();
  });

  it.each([
    ['amex', 'Amex'],
    ['discover', 'Discover'],
    ['mastercard', 'Mastercard'],
    ['visa', 'Visa']
  ])('displays an image for a %s card', (card_brand, expectedText) => {
    tree({ contribution: { ...testContribution, card_brand: card_brand as CardBrand } });
    expect(screen.getByRole('img', { name: expectedText })).toBeVisible();
  });

  it("doesn't display a card image if the card brand is unknown", () => {
    tree({ contribution: { ...testContribution, card_brand: '????' } as any });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it("doesn't allow editing if the disabled prop is true", () => {
    tree({ disabled: true });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it("doesn't allow editing if the contribution's is_modifiable property is false", () => {
    tree({ contribution: { ...testContribution, is_modifiable: false } });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it.each([[undefined], ['canceled'], ['processing']])(
    "doesn't allow editing if the contribution's status is %p",
    (status) => {
      tree({ contribution: { ...testContribution, status: status as PaymentStatus } });
      expect(screen.getByRole('button')).toBeDisabled();
    }
  );

  it('opens the edit dialog with the contribution when the last four digits are clicked', () => {
    tree();
    expect(getEditDialog()).toHaveAttribute('data-is-open', 'false');
    userEvent.click(screen.getAllByRole('button')[0]);
    expect(getEditDialog()).toHaveAttribute('data-is-open', 'true');
  });

  it('opens the edit dialog with the contribution when the edit button is clicked', () => {
    tree();
    expect(getEditDialog()).toHaveAttribute('data-is-open', 'false');
    userEvent.click(screen.getAllByRole('button')[1]);
    expect(getEditDialog()).toHaveAttribute('data-is-open', 'true');
  });

  it('closes the edit dialog when the user closes it', () => {
    tree();
    userEvent.click(screen.getAllByRole('button')[0]);
    expect(getEditDialog()).toHaveAttribute('data-is-open', 'true');
    userEvent.click(screen.getByRole('button', { name: 'closeModal' }));
    expect(getEditDialog()).toHaveAttribute('data-is-open', 'false');
  });

  it('calls the onUpdateComplete props when the user finishes editing in the dialog', () => {
    const onUpdateComplete = jest.fn();

    tree({ onUpdateComplete });
    userEvent.click(screen.getAllByRole('button')[0]);
    expect(getEditDialog()).toHaveAttribute('data-is-open', 'true');
    expect(onUpdateComplete).not.toBeCalled();
    userEvent.click(screen.getByRole('button', { name: 'onComplete' }));
    expect(onUpdateComplete).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
