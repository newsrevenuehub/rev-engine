import { axe } from 'jest-axe';
import { useHistory } from 'react-router-dom';
import { fireEvent, render, screen } from 'test-utils';

import { CONTENT_SLUG } from 'routes';
import DashboardTopbar from './DashboardTopbar';

jest.mock('components/authentication/logout', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('hooks/useRequest', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn()
}));

const page = {
  name: 'Page Name',
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
    expect(screen.getByRole('button', { name: 'Settings' })).toBeEnabled();
  });

  it('should hide grab link button if isEditPage = false', () => {
    render(<DashboardTopbar isEditPage={false} />);

    const grabLink = screen.queryByRole('button', { name: /grab link/i });
    expect(grabLink).not.toBeInTheDocument();
  });

  it('should show grab link if isEditPage = true and page is published', () => {
    render(<DashboardTopbar isEditPage page={page} />);

    const signOut = screen.queryByText('Sign out');
    expect(signOut).not.toBeInTheDocument();

    const grabLink = screen.getByRole('button', { name: /grab link/i });
    expect(grabLink).toBeEnabled();
  });

  it('should show back button if isEditPage = true', () => {
    render(<DashboardTopbar isEditPage page={page} />);
    expect(screen.getByTestId('back')).toBeEnabled();
    expect(screen.queryByTestId('modal-back')).not.toBeInTheDocument();
  });

  it('should call history if back button is clicked and if isEditPage = true', () => {
    const historyReplaceMock = jest.fn();
    useHistory.mockReturnValue({ replace: historyReplaceMock });

    render(<DashboardTopbar isEditPage page={page} />);
    fireEvent.click(screen.getByTestId('back'));
    expect(historyReplaceMock).toHaveBeenCalledWith(CONTENT_SLUG);
  });

  it('should show modal back button if isEditPage = true and updatedPage', () => {
    render(<DashboardTopbar isEditPage page={page} updatedPage={page} />);
    expect(screen.getByTestId('modal-back')).toBeEnabled();
    expect(screen.queryByTestId('back')).toBeNull();
  });

  it('should open modal if back button clicked and if isEditPage = true and updatedPage', () => {
    render(<DashboardTopbar isEditPage page={page} updatedPage={page} />);
    const backButton = screen.getByTestId('modal-back');
    expect(backButton).toBeEnabled();
    fireEvent.click(backButton);
    expect(screen.getByText('Unsaved Changes')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /yes, exit/i })).toBeEnabled();
  });

  it('should show NRH logo if isEditPage = false', () => {
    render(<DashboardTopbar isEditPage={false} page={page} />);
    // Has mobile and desktop logos
    expect(screen.getAllByAltText('News Revenue Hub Logo')).toHaveLength(2);
  });

  it('should show NRH logo if isEditPage = true', () => {
    render(<DashboardTopbar isEditPage page={page} />);
    expect(screen.getByAltText('News Revenue Hub Logo')).toBeVisible();
  });

  it('should show page name if isEditPage = true and has page', () => {
    render(<DashboardTopbar isEditPage page={page} />);
    expect(screen.getByText(page.name)).toBeVisible();
  });

  it('should not show page name if isEditPage = true and no page', () => {
    render(<DashboardTopbar isEditPage />);
    expect(screen.queryByText(page.name)).not.toBeInTheDocument();
  });

  it('is accessible with isEditPage = false', async () => {
    const { container } = render(<DashboardTopbar isEditPage={false} />);

    expect(await axe(container)).toHaveNoViolations();
  });

  it('is accessible with isEditPage = true', async () => {
    const { container } = render(<DashboardTopbar isEditPage page={page} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
