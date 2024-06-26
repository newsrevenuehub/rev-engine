import { axe } from 'jest-axe';
import { useSnackbar } from 'notistack';
import { fireEvent, render, screen } from 'test-utils';
import ContributionDetail, { ContributionDetailProps } from './ContributionDetail';
import { usePortalContribution } from 'hooks/usePortalContribution';

jest.mock('notistack');
jest.mock('components/paymentProviders/stripe/StripePaymentWrapper');
jest.mock('hooks/usePortalContribution');
jest.mock('./useDetailAnchor');
jest.mock('./Actions/Actions');
jest.mock('./Banner/Banner');
jest.mock('./BillingDetails/BillingDetails');
jest.mock('./BillingHistory/BillingHistory');
jest.mock('./MobileBackButton/MobileBackButton');
jest.mock('./MobileHeader/MobileHeader');
jest.mock('./PaymentMethod/PaymentMethod');

function tree(props?: Partial<ContributionDetailProps>) {
  return render(<ContributionDetail contributionId={1} contributorId={123} {...props} />);
}

describe('ContributionDetail', () => {
  const usePortalContributionMock = jest.mocked(usePortalContribution);
  const useSnackbarMock = jest.mocked(useSnackbar);
  let enqueueSnackbar: jest.Mock;

  beforeEach(() => {
    enqueueSnackbar = jest.fn();
    useSnackbarMock.mockReturnValue({ enqueueSnackbar } as any);
  });

  it('fetches the contribution matching the contributor and contribution ID in props', () => {
    usePortalContributionMock.mockReturnValue({
      isLoading: true,
      contribution: undefined,
      isError: false,
      isFetching: false,
      refetch: jest.fn(),
      cancelContribution: jest.fn(),
      updateContribution: jest.fn(),
      sendEmailReceipt: jest.fn()
    });

    tree();
    expect(usePortalContributionMock).toBeCalledWith(123, 1);
  });

  describe('While the contribution is loading', () => {
    beforeEach(() => {
      usePortalContributionMock.mockReturnValue({
        isLoading: true,
        contribution: undefined,
        isError: false,
        isFetching: false,
        refetch: jest.fn(),
        cancelContribution: jest.fn(),
        updateContribution: jest.fn(),
        sendEmailReceipt: jest.fn()
      });
    });

    it('shows the loading skeleton', () => {
      tree();
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('shows a mobile back button', () => {
      tree();
      expect(screen.getByTestId('mock-mobile-back-button')).toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('If an error occurs while loading the contribution', () => {
    beforeEach(() => {
      usePortalContributionMock.mockReturnValue({
        isLoading: false,
        contribution: undefined,
        isError: true,
        isFetching: false,
        refetch: jest.fn(),
        cancelContribution: jest.fn(),
        updateContribution: jest.fn(),
        sendEmailReceipt: jest.fn()
      });
    });

    it('shows an error message', () => {
      tree();
      expect(screen.getByText('Error loading contribution detail.')).toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When the contribution has loaded', () => {
    const mockContribution = {
      id: 1,
      payments: [{ mock: true }],
      stripe_account_id: 'mock-stripe-account-id'
    };

    beforeEach(() => {
      usePortalContributionMock.mockReturnValue({
        isLoading: false,
        contribution: mockContribution as any,
        isError: false,
        isFetching: false,
        refetch: jest.fn(),
        cancelContribution: jest.fn(),
        updateContribution: jest.fn(),
        sendEmailReceipt: jest.fn()
      });
    });

    it.each([['mobile header'], ['banner'], ['billing details'], ['payment method'], ['actions']])(
      'shows the %s',
      (name) => {
        tree();

        const component = screen.getByTestId(`mock-${name.replace(' ', '-')}`);

        expect(component).toBeInTheDocument();
        expect(component.dataset.contribution).toBe(`${mockContribution.id}`);
      }
    );

    it('shows a mobile back button', () => {
      tree();
      expect(screen.getByTestId('mock-mobile-back-button')).toBeInTheDocument();
    });

    it('shows the billing history', () => {
      tree();

      const history = screen.getByTestId('mock-billing-history');

      expect(history.dataset.payments).toBe(JSON.stringify(mockContribution.payments));
    });

    it('calls sendEmailReceipt when the "Resend receipt" button is clicked', () => {
      const sendEmailReceipt = jest.fn();
      usePortalContributionMock.mockReturnValue({
        isLoading: false,
        contribution: mockContribution as any,
        isError: false,
        isFetching: false,
        refetch: jest.fn(),
        updateContribution: jest.fn(),
        cancelContribution: jest.fn(),
        sendEmailReceipt
      });

      tree();
      expect(sendEmailReceipt).not.toHaveBeenCalled();

      screen.getByText('Resend receipt').click();

      expect(sendEmailReceipt).toBeCalledTimes(1);
    });

    it("doesn't disable any section initially", () => {
      tree();
      expect(screen.getByTestId('mock-billing-details').dataset.disabled).toBe('false');
      expect(screen.getByTestId('mock-billing-history').dataset.disabled).toBe('false');
      expect(screen.getByTestId('mock-payment-method').dataset.disabled).toBe('false');
    });

    it("doesn't make the payment method section editable initially", () => {
      // Other sections aren't editable at all right now.
      tree();
      expect(screen.getByTestId('mock-payment-method').dataset.editable).toBe('false');
    });

    describe('When payment method is edited', () => {
      it('disables the billing details section', () => {
        tree();
        fireEvent.click(screen.getByRole('button', { name: 'onEdit' }));
        expect(screen.getByTestId('mock-billing-details').dataset.disabled).toBe('true');
      });

      it('disables the billing history section', () => {
        tree();
        fireEvent.click(screen.getByRole('button', { name: 'onEdit' }));
        expect(screen.getByTestId('mock-billing-history').dataset.disabled).toBe('true');
      });

      it('makes the the payment method section editable', () => {
        tree();
        fireEvent.click(screen.getByRole('button', { name: 'onEdit' }));
        expect(screen.getByTestId('mock-payment-method').dataset.editable).toBe('true');
      });

      describe('When payment method finishes editing', () => {
        it("doesn't disable any section", () => {
          tree();
          fireEvent.click(screen.getByRole('button', { name: 'onEdit' }));
          fireEvent.click(screen.getByRole('button', { name: 'onEditComplete' }));
          expect(screen.getByTestId('mock-billing-details').dataset.disabled).toBe('false');
          expect(screen.getByTestId('mock-billing-history').dataset.disabled).toBe('false');
          expect(screen.getByTestId('mock-payment-method').dataset.disabled).toBe('false');
        });

        it('makes the payment method section non-editable', () => {
          tree();
          fireEvent.click(screen.getByRole('button', { name: 'onEdit' }));
          fireEvent.click(screen.getByRole('button', { name: 'onEditComplete' }));
          expect(screen.getByTestId('mock-payment-method').dataset.editable).toBe('false');
        });
      });

      describe('When the payment method is updated', () => {
        let updateContribution: jest.SpyInstance;

        beforeEach(() => {
          updateContribution = jest.fn();
          usePortalContributionMock.mockReturnValue({
            updateContribution,
            isLoading: false,
            cancelContribution: jest.fn(),
            contribution: mockContribution as any,
            isError: false,
            isFetching: false,
            refetch: jest.fn()
          } as any);
        });

        it("calls updateContribution with the payment method's ID and appropriate change type", () => {
          tree();
          fireEvent.click(screen.getByRole('button', { name: 'onEdit' }));
          expect(updateContribution).not.toBeCalled();
          fireEvent.click(screen.getByRole('button', { name: 'onUpdatePaymentMethod' }));
          expect(updateContribution.mock.calls).toEqual([
            [{ provider_payment_method_id: 'mock-payment-method-id' }, 'paymentMethod']
          ]);
        });
      });

      it('calls cancelContribution when the cancel button is clicked', () => {
        const cancelContribution = jest.fn();
        usePortalContributionMock.mockReturnValue({
          isLoading: false,
          contribution: mockContribution as any,
          isError: false,
          isFetching: false,
          refetch: jest.fn(),
          updateContribution: jest.fn(),
          cancelContribution,
          sendEmailReceipt: jest.fn()
        });

        tree();
        const cancelButton = screen.getByText('Cancel Contribution');
        cancelButton.click();

        expect(cancelContribution).toBeCalledWith();
        expect(cancelContribution).toBeCalledTimes(1);
      });

      it('is accessible', async () => {
        const { container } = tree();

        expect(await axe(container)).toHaveNoViolations();
      });
    });
  });
});
