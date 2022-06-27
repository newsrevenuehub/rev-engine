import { render, screen } from 'test-utils';

import DashboardTopbar from './DashboardTopbar';

const LOGOUT_TEST_ID = 'topbar-sign-out';

it('should show logout link in topbar', () => {
  render(<DashboardTopbar />);
  const logoutButton = screen.queryByTestId(LOGOUT_TEST_ID);
  expect(logoutButton).toBeInTheDocument();
});
