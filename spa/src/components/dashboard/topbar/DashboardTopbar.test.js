import { render, screen, fireEvent } from 'test-utils';

import DashboardTopbar from './DashboardTopbar';
import logout from 'components/authentication/logout';

jest.mock('components/authentication/logout', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('hooks/useRequest', () => ({
  __esModule: true,
  default: jest.fn()
}));

const page = {
  revenue_program: {
    slug: 'rev-prog-slug'
  },
  payment_provider: {},
  slug: 'page-slug',
  published_date: '2021-11-18T21:51:53Z'
};

const user = {
  email: 'mock@email.com'
};

describe('Dashboard TopBar', () => {
  it('should show avatar menu in topbar', () => {
    render(<DashboardTopbar isEditPage={false} user={user} />);
    expect(screen.getByRole('button', { name: 'settings menu' })).toBeEnabled();
  });

  it('should hide grab link button if isEditPage = false', () => {
    render(<DashboardTopbar isEditPage={false} />);

    const grabLink = screen.queryByRole('button', { name: /grab link/i });
    expect(grabLink).not.toBeInTheDocument();
  });

  it('should show grab link if isEditPage = true and page is published', () => {
    render(<DashboardTopbar isEditPage={true} page={page} />);

    const signOut = screen.queryByText('Sign out');
    expect(signOut).not.toBeInTheDocument();

    const grabLink = screen.getByRole('button', { name: /grab link/i });
    expect(grabLink).toBeEnabled();
  });
});
