import { render, screen, waitFor } from 'test-utils';
import TokenVerification from './TokenVerification';
import { PortalAuthContext, PortalAuthContextResult } from 'hooks/usePortalAuth';
import { useLocation } from 'react-router-dom';

jest.mock('components/common/GlobalLoading/GlobalLoading');
jest.mock('./TokenError');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Redirect: ({ to }: { to: string }) => <div data-testid="mock-redirect" data-to={to} />,
  useLocation: jest.fn()
}));

function tree(context: PortalAuthContextResult) {
  return render(
    <PortalAuthContext.Provider value={context}>
      <TokenVerification />
    </PortalAuthContext.Provider>
  );
}

describe('TokenVerification', () => {
  const useLocationMock = jest.mocked(useLocation);

  beforeEach(() => {
    useLocationMock.mockReturnValue({ search: '?email=mock-email&token=mock-token' });
  });

  describe('When the user is authenticated', () => {
    it('redirects to the contributions list', () => {
      tree({ contributor: { mockContributor: true } as any });
      expect(screen.getByTestId('mock-redirect').dataset.to).toBe('/portal/my-contributions/');
    });

    it('redirects to the custom URL if redirect is a query param', () => {
      useLocationMock.mockReturnValue({ search: '?email=mock-email&token=mock-token&redirect=/mock-redirect/' });
      tree({ contributor: { mockContributor: true } as any });
      expect(screen.getByTestId('mock-redirect').dataset.to).toBe('/mock-redirect/');
    });
  });

  describe("When the user isn't authenticated", () => {
    it.each([
      ['email', '?token=mock-token'],
      ['token', '?email=mock-email']
    ])("shows an error and doesn't try to verify the token if the %s querystring is missing", (_, search) => {
      const verifyToken = jest.fn();

      useLocationMock.mockReturnValue({ search });
      tree({ verifyToken });
      expect(screen.getByTestId('mock-token-error')).toBeInTheDocument();
      expect(verifyToken).not.toBeCalled();
    });

    describe('When email and token querystring params are set', () => {
      it('verifies the token', () => {
        const verifyToken = jest.fn();

        tree({ verifyToken });
        expect(verifyToken.mock.calls).toEqual([['mock-email', 'mock-token']]);
      });

      it('shows a spinner while verifying', () => {
        const verifyToken = jest.fn(() => new Promise(() => {}));

        tree({ verifyToken } as any);
        expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
      });

      it('shows an error if verifying fails', async () => {
        const verifyToken = jest.fn(() => Promise.reject(new Error()));

        tree({ verifyToken });
        await waitFor(() => expect(screen.queryByTestId('mock-global-loading')).not.toBeInTheDocument());
        expect(screen.getByTestId('mock-token-error')).toBeInTheDocument();
      });
    });
  });

  // No accessibility test because this component renders no UI of its own.
});
