import { within, screen } from '@testing-library/react';

import { render } from 'test-utils';
import DashboardSidebar from './DashboardSidebar';
import { DONATIONS_SLUG, CUSTOMIZE_SLUG, CONTENT_SLUG } from 'routes';

jest.mock('hooks/useUser', () => ({
  __esModule: true,
  default: () => ({ user: { organizations: [{ name: 'mock-rp-name' }] } })
}));

jest.mock('components/Main', () => ({
  __esModule: true,
  useFeatureFlagsProviderContext: () => ({ featureFlags: [] })
}));

jest.mock('utilities/flagIsActiveForUser', () => ({
  __esModule: true,
  default: () => true
}));

var mock = jest.fn().mockReturnValue(true);
jest.mock('utilities/hasContributionsDashboardAccessToUser', () => {
  return () => mock();
});

it('should have expected appearance and links', () => {
  mock.mockReturnValue(true);
  render(<DashboardSidebar />);
  const contentNavSection = screen.getByRole('navigation', { name: /Content/ });
  expect(within(contentNavSection).getByRole('listitem', { name: /Pages/ })).toHaveAttribute('href', CONTENT_SLUG);
  expect(within(contentNavSection).getByRole('listitem', { name: /Customize/ })).toHaveAttribute(
    'href',
    CUSTOMIZE_SLUG
  );

  const activityNavSection = screen.getByRole('navigation', { name: /Activity/ });
  expect(within(activityNavSection).getByRole('listitem', { name: /Contributions/ })).toHaveAttribute(
    'href',
    DONATIONS_SLUG
  );

  expect(screen.getByText('mock-rp-name')).toBeVisible();
});

it('should disable Contributions dashboard', () => {
  mock.mockReturnValue(false);
  render(<DashboardSidebar />);
  expect(screen.queryByTestId(/Contributions/i)).toBeNull();
});
