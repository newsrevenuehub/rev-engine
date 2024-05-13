import useUser from 'hooks/useUser';
import { Helmet } from 'react-helmet';
import { render, screen } from 'test-utils';
import { getUserRole } from 'utilities/getUserRole';
import ContributorPortal from './ContributorPortalRoute';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  Redirect({ to }: { to: string }) {
    return <div data-testid="mock-redirect">{to}</div>;
  }
}));
jest.mock('components/common/GlobalLoading/GlobalLoading');
jest.mock('utilities/getUserRole');
jest.mock('hooks/useUser');
jest.mock('components/content/contributor-portal/ContributorPortal', () => () => (
  <div data-testid="contributor-portal" />
));

function tree() {
  return render(<ContributorPortal />);
}

describe('Contributor Portal', () => {
  const getUserRoleMock = jest.mocked(getUserRole);
  const useUserMock = jest.mocked(useUser);

  beforeEach(() => {
    useUserMock.mockReturnValue({ user: {}, isLoading: false } as any);
    getUserRoleMock.mockReturnValue({ isSuperUser: false, isHubAdmin: false } as any);
  });

  it('shows a loading indicator while the user is loading', () => {
    useUserMock.mockReturnValue({ isLoading: true } as any);
    tree();
    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
  });

  it.each([
    ['superuser', { isSuperUser: true }],
    ['hub admin', { isHubAdmin: true }]
  ])('redirects to /pages/ if user role = %s', (_, role) => {
    getUserRoleMock.mockReturnValue(role as any);
    tree();
    expect(screen.getByTestId('mock-redirect')).toHaveTextContent('/pages/');
  });

  it('should render Contributor Portal page', () => {
    tree();
    const helmet = Helmet.peek();
    expect(helmet.title).toBe('Contributor Portal | RevEngine');
    expect(screen.getByTestId('contributor-portal')).toBeInTheDocument();
  });
});
