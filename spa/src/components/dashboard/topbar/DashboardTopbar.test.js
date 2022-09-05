import { render, screen, fireEvent } from 'test-utils';

import DashboardTopbar from './DashboardTopbar';
import logout from 'components/authentication/logout';

jest.mock('components/authentication/logout', () => ({
  __esModule: true,
  default: jest.fn()
}));

const page = {
  revenue_program: {
    slug: 'rev-prog-slug'
  },
  slug: 'page-slug'
};

describe('Dashboard TopBar', () => {
  it('should show logout link in topbar', () => {
    render(<DashboardTopbar isEditPage={false} />);
    fireEvent.click(screen.getByText('Sign out'));
    expect(logout).toHaveBeenCalled();

    const grabLink = screen.queryByRole('button', { name: /grab link/i });
    expect(grabLink).not.toBeInTheDocument();
  });

  it('should show grab link if isEditPage = true', () => {
    render(<DashboardTopbar isEditPage={true} page={page} />);

    const signOut = screen.queryByText('Sign out');
    expect(signOut).not.toBeInTheDocument();

    const grabLink = screen.getByRole('button', { name: /grab link/i });
    expect(grabLink).toBeEnabled();
  });
});
