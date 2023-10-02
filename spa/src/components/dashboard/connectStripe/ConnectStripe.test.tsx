import { fireEvent, render, screen } from 'test-utils';
import ConnectStripe from './ConnectStripe';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import { useSnackbar } from 'notistack';
import { useCookies } from 'react-cookie';
import { CONNECT_STRIPE_COOKIE_NAME } from 'constants/textConstants';

jest.mock('notistack');
jest.mock('react-cookie');
jest.mock('hooks/useConnectStripeAccount');
jest.mock('./ConnectStripeModal');
jest.mock('./ConnectStripeToast');

function tree() {
  return render(<ConnectStripe />);
}

describe('ConnectStripe', () => {
  const useCookiesMock = jest.mocked(useCookies);
  const useSnackbarMock = jest.mocked(useSnackbar);
  const useStripeConnectAccountMock = jest.mocked(useConnectStripeAccount);

  beforeEach(() => {
    useSnackbarMock.mockReturnValue({ enqueueSnackbar: jest.fn() } as any);
    useCookiesMock.mockReturnValue([{}, jest.fn(), jest.fn()]);
  });

  it('shows nothing while Stripe status is loading', () => {
    useStripeConnectAccountMock.mockReturnValue({
      isError: false,
      isLoading: true,
      displayConnectionSuccess: false,
      hideConnectionSuccess: jest.fn()
    });
    tree();
    expect(document.body).toHaveTextContent('');
  });

  it('shows a persistent notification and hides the  when Stripe has first been connected', () => {
    const enqueueSnackbar = jest.fn();
    const hideConnectionSuccess = jest.fn();

    useSnackbarMock.mockReturnValue({ enqueueSnackbar } as any);
    useStripeConnectAccountMock.mockReturnValue({
      hideConnectionSuccess,
      isError: false,
      isLoading: false,
      displayConnectionSuccess: true
    });
    tree();
    expect(enqueueSnackbar.mock.calls).toEqual([
      [
        'Stripe verification has been completed. Your contribution page can now be published!',
        expect.objectContaining({ persist: true })
      ]
    ]);
    expect(hideConnectionSuccess).toBeCalledTimes(1);
  });

  it("doesn't show a notification if Stripe hasn't been connected", () => {
    const enqueueSnackbar = jest.fn();

    useSnackbarMock.mockReturnValue({ enqueueSnackbar } as any);
    useStripeConnectAccountMock.mockReturnValue({
      isError: false,
      isLoading: false,
      displayConnectionSuccess: false,
      hideConnectionSuccess: jest.fn()
    });
    tree();
    expect(enqueueSnackbar).not.toBeCalled();
  });

  describe('If Stripe verification is needed', () => {
    let sendUserToStripe: jest.Mock;
    let updateOptions: jest.Mock;

    beforeEach(() => {
      sendUserToStripe = jest.fn();
      updateOptions = jest.fn();
      (window as any).pendo = { updateOptions };
      useStripeConnectAccountMock.mockReturnValue({
        sendUserToStripe,
        isError: false,
        isLoading: false,
        displayConnectionSuccess: false,
        hideConnectionSuccess: jest.fn(),
        requiresVerification: true
      });
    });

    afterEach(() => delete (window as any).pendo);

    describe("And the user doesn't have a cookie saying they've closed the modal before", () => {
      let setCookie: jest.Mock;

      beforeEach(() => {
        setCookie = jest.fn();
        useCookiesMock.mockReturnValue([{}, setCookie, jest.fn()]);
      });

      it('shows the Stripe connection modal', () => {
        tree();
        expect(screen.getByTestId('mock-connect-stripe-modal')).toBeInTheDocument();
      });

      it("doesn't show the Stripe connection toast", () => {
        tree();
        expect(screen.queryByTestId('mock-connect-stripe-toast')).not.toBeInTheDocument();
      });

      describe('When the user chooses to connect to Stripe now', () => {
        it('sends the user to Stripe', () => {
          tree();
          expect(sendUserToStripe).not.toBeCalled();
          fireEvent.click(screen.getByText('onConnectStripe'));
          expect(sendUserToStripe).toBeCalledTimes(1);
        });

        it('records this in Pendo metadata', () => {
          tree();
          expect(updateOptions).not.toBeCalled();
          fireEvent.click(screen.getByText('onConnectStripe'));
          expect(updateOptions.mock.calls).toEqual([
            [{ visitor: { stripe_connection_modal_first_interaction: expect.any(String) } }]
          ]);
          expect(
            new Date(updateOptions.mock.calls[0][0].visitor.stripe_connection_modal_first_interaction).toString()
          ).not.toBe('Invalid Date');
        });

        it('sets the cookie accordingly', () => {
          tree();
          expect(setCookie).not.toBeCalled();
          fireEvent.click(screen.getByText('onConnectStripe'));
          expect(setCookie.mock.calls).toEqual([[CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' }]]);
        });
      });

      describe('When the user chooses to connect to Stripe later', () => {
        it('closes the modal', () => {
          tree();
          fireEvent.click(screen.getByText('onClose'));
          expect(screen.queryByTestId('mock-connect-stripe-modal')).not.toBeInTheDocument();
        });

        it('shows the Stripe connection toast', () => {
          tree();
          fireEvent.click(screen.getByText('onClose'));
          expect(screen.getByTestId('mock-connect-stripe-toast')).toBeInTheDocument();
        });

        it('records this in Pendo metadata', () => {
          tree();
          expect(updateOptions).not.toBeCalled();
          fireEvent.click(screen.getByText('onClose'));
          expect(updateOptions.mock.calls).toEqual([
            [{ visitor: { stripe_connection_modal_first_interaction: expect.any(String) } }]
          ]);
          expect(
            new Date(updateOptions.mock.calls[0][0].visitor.stripe_connection_modal_first_interaction).toString()
          ).not.toBe('Invalid Date');
        });

        it('sets the cookie accordingly', () => {
          tree();
          expect(setCookie).not.toBeCalled();
          fireEvent.click(screen.getByText('onClose'));
          expect(setCookie.mock.calls).toEqual([[CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' }]]);
        });
      });
    });

    describe("And the user does have a cookie saying they've closed the modal before", () => {
      beforeEach(() => {
        useCookiesMock.mockReturnValue([{ [CONNECT_STRIPE_COOKIE_NAME]: 'true' }, jest.fn(), jest.fn()]);
      });

      it('shows the Stripe connection toast', () => {
        tree();
        expect(screen.getByTestId('mock-connect-stripe-toast')).toBeInTheDocument();
      });

      it("doesn't show the Stripe connection modal", () => {
        tree();
        expect(screen.queryByTestId('mock-connect-stripe-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe("If Stripe verification isn't needed", () => {
    beforeEach(() => {
      useStripeConnectAccountMock.mockReturnValue({
        isError: false,
        isLoading: false,
        displayConnectionSuccess: false,
        hideConnectionSuccess: jest.fn(),
        requiresVerification: false
      });
    });

    it("doesn't show the Stripe connection modal", () => {
      tree();
      expect(screen.queryByTestId('mock-connect-stripe-modal')).not.toBeInTheDocument();
    });

    it("doesn't show the Stripe connection toast", () => {
      tree();
      expect(screen.queryByTestId('mock-connect-stripe-toast')).not.toBeInTheDocument();
    });
  });
});
