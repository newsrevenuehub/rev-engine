import { within, screen } from '@testing-library/react';

import { render } from 'test-utils';
import DashboardSidebar from './DashboardSidebar';
import { DONATIONS_SLUG, CUSTOMIZE_SLUG, CONTENT_SLUG } from 'routes';

jest.mock('components/Main', () => ({
  __esModule: true,
  useFeatureFlagsProviderContext: () => ({ featureFlags: [] })
}));

jest.mock('utilities/flagIsActiveForUser', () => ({
  __esModule: true,
  default: () => true
}));

it('should have expected appearance and links', () => {
  render(<DashboardSidebar shouldAllowDashboard={true} />);
  const sidebar = screen.getByRole('list', { name: /Dashboard/ });

  const contentNavSection = within(sidebar).getByRole('navigation', { name: /Content/ });
  expect(within(contentNavSection).getByRole('listitem', { name: /Pages/ })).toHaveAttribute('href', CONTENT_SLUG);
  expect(within(contentNavSection).getByRole('listitem', { name: /Customize/ })).toHaveAttribute(
    'href',
    CUSTOMIZE_SLUG
  );

  const activityNavSection = within(sidebar).getByRole('navigation', { name: /Activity/ });
  expect(within(activityNavSection).getByRole('listitem', { name: /Contributions/ })).toHaveAttribute(
    'href',
    DONATIONS_SLUG
  );
});
