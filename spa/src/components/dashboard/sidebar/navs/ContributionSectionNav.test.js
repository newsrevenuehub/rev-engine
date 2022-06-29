import { render, screen } from 'test-utils';

import ContributionSectionNav from './ContributionSectionNav';

const CONTRIBUTIONS_TEST_ID = 'nav-contributions-item';

it('should show contributions link if user hasContributionsSectionAccess', () => {
  render(<ContributionSectionNav hasContributionsSectionAccess={true} shouldAllowDashboard={true} />);
  const contributionsLink = screen.queryByTestId(CONTRIBUTIONS_TEST_ID);
  expect(contributionsLink).toBeInTheDocument();
});

it('should not show contributions link if hasContributionsSectionAccess is false', () => {
  render(<ContributionSectionNav hasContributionsSectionAccess={false} shouldAllowDashboard={true} />);
  const contributionsLink = screen.queryByTestId(CONTRIBUTIONS_TEST_ID);
  expect(contributionsLink).not.toBeInTheDocument();
});
