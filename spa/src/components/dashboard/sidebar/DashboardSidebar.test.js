import { within, screen } from '@testing-library/react';

import { render } from 'test-utils';
import DashboardSidebar from './DashboardSidebar';
import { DONATIONS_SLUG, CUSTOMIZE_SLUG, CONTENT_SLUG } from 'routes';

jest.mock('components/Main', () => ({
  __esModule: true,
  useUserProviderContext: () => ({ user: { flags: [] } })
}));

jest.mock('utilities/flagIsActiveForUser', () => ({
  __esModule: true,
  default: () => true
}));

it('should have expected appearance and links', () => {
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
});
