import { render, screen, fireEvent } from 'test-utils';
import getDomain from 'utilities/getDomain';

import GrabLink from './GrabLink';

const page = {
  revenue_program: {
    slug: 'news-revenue-hub'
  },
  slug: 'donate'
};

const mockClipboard = {
  writeText: jest.fn()
};

global.navigator.clipboard = mockClipboard;
const domain = getDomain(window.location.host);

describe('GrabLink', () => {
  it('should render grab link button', () => {
    render(<GrabLink page={page} />);
    const button = screen.getByRole('button', { name: /grab link/i });
    expect(button).toBeEnabled();
  });

  it('should open popup and have all information', () => {
    render(<GrabLink page={page} />);

    const button = screen.getByRole('button', { name: /grab link/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    const contributionLabel = screen.getByText(/Contribution Page Link/i);
    expect(contributionLabel).toBeVisible();

    const contributorLabel = screen.getByText(/Contributor Portal Link/i);
    expect(contributorLabel).toBeVisible();

    const copyButtons = screen.queryAllByRole('button', { name: /copy/i });
    expect(copyButtons).toHaveLength(2);

    const pageLink = screen.getByRole('textbox', { name: `${page.revenue_program.slug}.${domain}/${page.slug}` });
    expect(pageLink).toBeInTheDocument();

    const portalLink = screen.getByRole('textbox', { name: `${page.revenue_program.slug}.${domain}/contributor` });
    expect(portalLink).toBeInTheDocument();
  });

  it('should open popup and copy link', () => {
    render(<GrabLink page={page} />);

    const button = screen.getByRole('button', { name: /grab link/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    fireEvent.click(screen.getByRole('button', { name: /copy contribution page link/i }));
    expect(screen.getByRole('button', { name: /copied contribution page link/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /copy contribution page link/i })).toBeNull();
    expect(mockClipboard.writeText.mock.calls).toEqual([[`${page.revenue_program.slug}.${domain}/${page.slug}`]]);
  });
});
