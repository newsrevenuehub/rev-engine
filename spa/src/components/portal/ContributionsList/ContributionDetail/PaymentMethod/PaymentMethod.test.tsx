import { useElements, useStripe } from '@stripe/react-stripe-js';
import { axe } from 'jest-axe';
import { useSnackbar } from 'notistack';
import { fireEvent, render, screen, waitFor } from 'test-utils';
import { PaymentMethod, PaymentMethodProps } from './PaymentMethod';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import { formattedCardBrands } from 'constants/creditCard';

jest.mock('notistack');
jest.mock('@stripe/react-stripe-js');
jest.mock('../DetailSection/DetailSection');
jest.mock('./StripeCardForm');

const mockContribution: PortalContributionDetail = {
  amount: 12345,
  card_brand: 'amex',
  created: new Date().toISOString(),
  card_expiration_date: new Date().toISOString(),
  card_last_4: '7890',
  card_owner_name: 'mock-cc-owner-name',
  id: 1,
  interval: 'month',
  is_cancelable: false,
  is_modifiable: false,
  first_payment_date: new Date().toISOString(),
  last_payment_date: new Date().toISOString(),
  next_payment_date: new Date().toISOString(),
  paid_fees: false,
  payments: [],
  payment_type: 'card',
  revenue_program: {} as any,
  status: 'paid',
  stripe_account_id: 'mock-stripe-account-id'
};

function tree(props?: Partial<PaymentMethodProps>) {
  return render(
    <PaymentMethod
      contribution={mockContribution}
      onEdit={jest.fn()}
      onEditComplete={jest.fn()}
      onUpdatePaymentMethod={jest.fn()}
      {...props}
    />
  );
}

describe('PaymentMethod', () => {
  const useElementsMock = jest.mocked(useElements);
  const useStripeMock = jest.mocked(useStripe);
  const useSnackbarMock = jest.mocked(useSnackbar);
  let enqueueSnackbar: jest.Mock;

  beforeEach(() => {
    enqueueSnackbar = jest.fn();
    useSnackbarMock.mockReturnValue({ enqueueSnackbar } as any);
  });

  it('shows a header', () => {
    tree();
    expect(screen.getByText('Payment Method')).toBeInTheDocument();
  });

  describe('In read-only mode', () => {
    it('shows the credit card owner name', () => {
      tree();
      expect(screen.getByTestId('cc_owner_name')).toHaveTextContent(mockContribution.card_owner_name);
    });

    it.each(Object.entries(formattedCardBrands))('shows a %s credit card as "%s"', (card_brand, formattedCardBrand) => {
      tree({ contribution: { ...mockContribution, card_brand } as any });
      expect(screen.getByTestId('card_brand')).toHaveTextContent(formattedCardBrand);
    });

    it('shows the last four digits of the credit card', () => {
      tree();
      expect(screen.getByTestId('last4')).toHaveTextContent(mockContribution.card_last_4);
    });

    it('shows the card expiration date', () => {
      tree();
      expect(screen.getByTestId('expiration')).toHaveTextContent(mockContribution.card_expiration_date);
    });

    it('shows a button that calls onEdit when clicked if the contribution is modifiable', () => {
      const onEdit = jest.fn();

      tree({ onEdit, contribution: { ...mockContribution, is_modifiable: true } });
      expect(screen.getByRole('button', { name: 'Change payment method' })).toBeVisible();
      expect(onEdit).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Change payment method' }));
      expect(onEdit).toBeCalledTimes(1);
    });

    it("doesn't show an edit button if the contribution isn't modifiable", () => {
      tree({ contribution: { ...mockContribution, is_modifiable: false } });
      expect(screen.queryByRole('button', { name: 'Change payment method' })).not.toBeInTheDocument();
    });

    it('disables its DetailSection and edit button if the disabled prop is true', () => {
      tree({ contribution: { ...mockContribution, is_modifiable: true }, disabled: true });
      expect(screen.getByRole('button', { name: 'Change payment method' })).toBeDisabled();
      expect(screen.getByTestId('mock-detail-section').dataset.disabled).toBe('true');
    });

    it('enables its DetailSection if the disabled prop is false', () => {
      tree({ disabled: false });
      expect(screen.getByTestId('mock-detail-section').dataset.disabled).toBe('false');
    });

    it("doesn't highlight its DetailSection", () => {
      tree();
      expect(screen.getByTestId('mock-detail-section').dataset.highlighted).toBeUndefined();
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('In editable mode', () => {
    it('highlights its DetailSection', () => {
      tree({ editable: true });
      expect(screen.getByTestId('mock-detail-section').dataset.highlighted).toBe('true');
    });

    it('shows a cancel button which calls onEditComplete', () => {
      const onEditComplete = jest.fn();

      tree({ onEditComplete, editable: true });
      expect(onEditComplete).not.toBeCalled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onEditComplete).toBeCalledTimes(1);
    });

    it("initially sets the name field of the credit card field to what's set in the contribution", () => {
      tree({ editable: true });
      expect(screen.getByRole('textbox', { name: 'Name on Card' })).toHaveValue(mockContribution.card_owner_name);
    });

    describe('The Save button', () => {
      function treeAndCompleteStripeForm(props?: Partial<PaymentMethodProps>) {
        tree({ contribution: { ...mockContribution, card_owner_name: '' }, editable: true, ...props });
        fireEvent.click(screen.getByRole('button', { name: 'onChangeCardComplete true' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Name on Card' }), { target: { value: 'new-name' } });
      }

      it('is initially disabled', () => {
        tree({ editable: true });
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      });

      it('remains disabled if only a name is entered', () => {
        tree({ editable: true });
        fireEvent.change(screen.getByRole('textbox', { name: 'Name on Card' }), { target: { value: 'change' } });
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      });

      it('remains disabled if only a new credit card number are entered in the Stripe card form', () => {
        tree({ contribution: { ...mockContribution, card_owner_name: '' }, editable: true });
        fireEvent.click(screen.getByRole('button', { name: 'onChangeCardComplete true' }));
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      });

      it('remains disabled if a credit card number is entered, but a blank name is entered', () => {
        tree({ editable: true });
        fireEvent.change(screen.getByRole('textbox', { name: 'Name on Card' }), { target: { value: ' ' } });
        fireEvent.click(screen.getByRole('button', { name: 'onChangeCardComplete true' }));
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      });

      it('is enabled if a name and new credit card number are entered in the Stripe card form', () => {
        treeAndCompleteStripeForm();
        expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
      });

      it('disables if previously enabled, but name is cleared', () => {
        treeAndCompleteStripeForm();
        expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
        fireEvent.change(screen.getByRole('textbox', { name: 'Name on Card' }), { target: { value: '' } });
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      });

      it('disables if previously enabled, but credit card number becomes incomplete', () => {
        treeAndCompleteStripeForm();
        expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'onChangeCardComplete false' }));
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      });

      describe("when clicked after it's enabled", () => {
        let createPaymentMethod: jest.SpyInstance;

        beforeEach(() => {
          createPaymentMethod = jest.fn();
          createPaymentMethod.mockResolvedValue({ paymentMethod: { mockNewPaymentMethod: true } });
          useStripeMock.mockReturnValue({ createPaymentMethod } as any);
          useElementsMock.mockReturnValue({ getElement: () => ({ mockCardElement: true }) } as any);
        });

        it('creates a new Stripe payment method', () => {
          treeAndCompleteStripeForm();
          fireEvent.click(screen.getByRole('button', { name: 'Save' }));
          expect(createPaymentMethod.mock.calls).toEqual([
            [
              {
                billing_details: { name: 'new-name' },
                card: { mockCardElement: true },
                type: 'card'
              }
            ]
          ]);
        });

        describe('When creating a new payment method succeeds', () => {
          it('calls onUpdatePaymentMethod with the new method', async () => {
            const onUpdatePaymentMethod = jest.fn();

            treeAndCompleteStripeForm({ onUpdatePaymentMethod });
            fireEvent.click(screen.getByRole('button', { name: 'Save' }));
            expect(onUpdatePaymentMethod).not.toBeCalled();
            await waitFor(() => expect(onUpdatePaymentMethod).toBeCalled());
            expect(onUpdatePaymentMethod.mock.calls).toEqual([[{ mockNewPaymentMethod: true }]]);
          });

          it('calls onEditComplete', async () => {
            const onEditComplete = jest.fn();

            treeAndCompleteStripeForm({ onEditComplete });
            fireEvent.click(screen.getByRole('button', { name: 'Save' }));
            await waitFor(() => expect(onEditComplete).toBeCalled());
          });
        });

        describe('When creating a new payment method fails', () => {
          let errorSpy: jest.SpyInstance;

          beforeEach(() => {
            createPaymentMethod.mockResolvedValue({ error: new Error('mock-error') });
            errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
          });

          afterEach(() => errorSpy.mockRestore());

          it('shows an error notification', async () => {
            treeAndCompleteStripeForm();
            fireEvent.click(screen.getByRole('button', { name: 'Save' }));
            await waitFor(() => expect(enqueueSnackbar).toBeCalled());
            expect(enqueueSnackbar.mock.calls).toEqual([
              [
                'A problem occurred while updating your payment method. Please try again.',
                expect.objectContaining({ persist: true })
              ]
            ]);
          });

          it("doesn't call onUpdatePaymentMethod", async () => {
            const onUpdatePaymentMethod = jest.fn();

            treeAndCompleteStripeForm({ onUpdatePaymentMethod });
            fireEvent.click(screen.getByRole('button', { name: 'Save' }));
            await waitFor(() => expect(enqueueSnackbar).toBeCalled());
            expect(onUpdatePaymentMethod).not.toBeCalled();
          });

          it("doesn't call onEditComplete", async () => {
            const onEditComplete = jest.fn();

            treeAndCompleteStripeForm({ onEditComplete });
            fireEvent.click(screen.getByRole('button', { name: 'Save' }));
            await waitFor(() => expect(enqueueSnackbar).toBeCalled());
            expect(onEditComplete).not.toBeCalled();
          });
        });
      });
    });

    it('is accessible', async () => {
      const { container } = tree({ editable: true });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
