import { render, screen } from 'test-utils';

import ContentSectionNav from './ContentSectionNav';
import { CONTENT_SLUG, CUSTOMIZE_SLUG } from 'routes';

const PAGES_TEST_ID = 'nav-pages-item';
const STYLES_TEST_ID = 'nav-styles-item';

it('should show pages and styles link if user hasContentSectionAccess', () => {
  render(<ContentSectionNav hasContentSectionAccess={true} shouldAllowDashboard={true} />);

  const pagesLink = screen.queryByTestId(PAGES_TEST_ID);
  expect(pagesLink).toBeInTheDocument();

  const stylesLink = screen.queryByTestId(STYLES_TEST_ID);
  expect(stylesLink).toBeInTheDocument();
});

it('should not show pages and styles link if user does not haveContentSectionAccess', () => {
  render(<ContentSectionNav hasContentSectionAccess={false} shouldAllowDashboard={true} />);

  const pagesLink = screen.queryByTestId(PAGES_TEST_ID);
  expect(pagesLink).not.toBeInTheDocument();

  const stylesLink = screen.queryByTestId(STYLES_TEST_ID);
  expect(stylesLink).not.toBeInTheDocument();
});
