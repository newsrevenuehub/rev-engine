import { render, screen, fireEvent } from 'test-utils';

import DashboardTopbar from './DashboardTopbar';
import logout from 'components/authentication/logout';

jest.mock('components/authentication/logout', () => ({
  __esModule: true,
  default: jest.fn()
}));

it('should show logout link in topbar', () => {
  render(<DashboardTopbar isEditPage={false} />);
  fireEvent.click(screen.getByText('Sign out'));
  expect(logout).toHaveBeenCalled();
});
