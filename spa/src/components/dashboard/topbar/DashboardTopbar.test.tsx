import { render, screen } from 'test-utils';
import { axe } from 'jest-axe';
import { useHistory } from 'react-router-dom';
import DashboardTopbar, { DashboardTopbarProps } from './DashboardTopbar';

jest.mock('components/authentication/logout');
jest.mock('hooks/useRequest');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn()
}));

const user = { email: 'mock@email.com' };

function tree(props?: Partial<DashboardTopbarProps>) {
  return render(<DashboardTopbar user={user as any} {...props} />);
}

describe('DashboardTopbar', () => {
  const useHistoryMock = useHistory as jest.Mock;

  beforeEach(() => useHistoryMock.mockReturnValue({ replace: jest.fn() }));

  it('shows an avatar menu', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeEnabled();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
