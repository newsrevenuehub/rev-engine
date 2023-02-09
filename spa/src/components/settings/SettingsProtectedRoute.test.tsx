import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';

import useUser from 'hooks/useUser';

import SettingsProtectedRoute, { SettingsProtectedRouteProps } from './SettingsProtectedRoute';

jest.mock('hooks/useUser');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Redirect: ({ to }: { to: string }) => <div>mock-redirect-to-{to}</div>
}));

describe('Settings Protected Route', () => {
  const useUserMock = useUser as jest.Mock;

  function tree(props?: Partial<SettingsProtectedRouteProps>) {
    return render(
      <SettingsProtectedRoute {...props}>
        <div>mock-render-protected-settings-route</div>
      </SettingsProtectedRoute>
    );
  }

  it('should redirect if user has multiple orgs', () => {
    useUserMock.mockReturnValue({
      user: {
        organizations: [{ id: 'mock-org-1' }, { id: 'mock-org-2' }]
      },
      isLoading: false
    });
    tree();

    expect(screen.queryByText('mock-render-protected-settings-route')).not.toBeInTheDocument();
    expect(screen.getByText('mock-redirect-to-/pages/')).toBeInTheDocument();
  });

  it("shouldn't redirect if user has only 1 org", async () => {
    useUserMock.mockReturnValue({
      user: {
        organizations: [{ id: 'mock-org' }]
      }
    });

    tree();
    expect(screen.getByText('mock-render-protected-settings-route')).toBeInTheDocument();
    expect(screen.queryByText('mock-redirect-to-/pages/')).not.toBeInTheDocument();
  });

  it("shouldn't redirect if isLoading = true", async () => {
    useUserMock.mockReturnValue({
      user: {
        organizations: [{ id: 'mock-org' }, { id: 'mock-org' }]
      },
      isLoading: true
    });

    tree();
    expect(screen.getByText('mock-render-protected-settings-route')).toBeInTheDocument();
    expect(screen.queryByText('mock-redirect-to-/pages/')).not.toBeInTheDocument();
  });

  it('should be accessible', async () => {
    useUserMock.mockReturnValue({
      user: {
        organizations: [{ id: 'mock-org' }]
      }
    });
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
