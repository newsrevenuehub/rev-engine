import { render, screen } from 'test-utils';
import ProtectedRoute, { ProtectedRouteProps } from './ProtectedRoute';
import isAuthenticated from 'utilities/isAuthenticated';
import { SIGN_IN } from 'routes';

jest.mock('utilities/isAuthenticated');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Redirect({ to }: { to: string }) {
    return <div data-testid="mock-redirect">{to}</div>;
  }
}));
jest.mock('hooks/useSentry', () => ({
  ...jest.requireActual('hooks/useSentry'),
  SentryRoute: () => <div data-testid="mock-sentry-route" />
}));

function tree(props?: Partial<ProtectedRouteProps>) {
  return render(<ProtectedRoute {...props} />);
}

describe('ProtectedRoute', () => {
  const isAuthenticatedMock = isAuthenticated as jest.Mock;

  beforeEach(() => isAuthenticatedMock.mockReturnValue(false));

  describe.each(['PORTAL', 'CONTRIBUTOR'] as Array<ProtectedRouteProps['contributorType']>)(
    'when the contributor type prop is %s',
    (contributorType) => {
      it('displays a SentryRoute if the user is authenticated as a contributor', () => {
        isAuthenticatedMock.mockImplementation((value?: boolean) => !!value);
        tree({ contributorType });
        expect(screen.getByTestId('mock-sentry-route')).toBeInTheDocument();
      });

      it('displays a signin redirect if the user is authenticated as an admin only', () => {
        isAuthenticatedMock.mockImplementation((value?: boolean) => !value);
        tree({ contributorType });
        expect(screen.getByTestId('mock-redirect')).toHaveTextContent(SIGN_IN);
      });

      it('displays a signin redirect if the user is not authenticated', () => {
        isAuthenticatedMock.mockReturnValue(false);
        tree({ contributorType });
        expect(screen.getByTestId('mock-redirect')).toHaveTextContent(SIGN_IN);
      });
    }
  );

  describe('when the contributor prop is undefined', () => {
    it('displays a SentryRoute if the user is authenticated as an admin', () => {
      isAuthenticatedMock.mockImplementation((value?: boolean) => !value);
      tree({ contributorType: undefined });
      expect(screen.getByTestId('mock-sentry-route')).toBeInTheDocument();
    });

    it('displays a signin redirect if the user is authenticated as a contributor only', () => {
      isAuthenticatedMock.mockImplementation((value?: boolean) => !!value);
      tree({ contributorType: undefined });
      expect(screen.getByTestId('mock-redirect')).toHaveTextContent(SIGN_IN);
    });

    it('displays a signin redirect if the user is not authenticated', () => {
      isAuthenticatedMock.mockReturnValue(false);
      tree({ contributorType: undefined });
      expect(screen.getByTestId('mock-redirect')).toHaveTextContent(SIGN_IN);
    });
  });
});
