import { render, screen, fireEvent, waitFor } from 'test-utils';
import getDomain from 'utilities/getDomain';

import GrabLink from './GrabLink';

const page = {
  revenue_program: {
    slug: 'news-revenue-hub'
  },
  slug: 'donate',
  published_date: '2021-11-18T21:51:53Z'
};

const mockClipboard = {
  writeText: jest.fn()
};

global.navigator.clipboard = mockClipboard;
const domain = getDomain(window.location.host);

describe('GrabLink', () => {
  it('should not render grab link if page is not published', () => {
    render(<GrabLink page={{ ...page, published_date: null }} />);
    const button = screen.queryByRole('button', { name: /grab link/i });
    expect(button).not.toBeInTheDocument();
  });

  it('should render grab link button if page is published', () => {
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

  it('should open popup and copy link', async () => {
    mockClipboard.writeText.mockResolvedValue();
    render(<GrabLink page={page} />);

    const button = screen.getByRole('button', { name: /grab link/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    fireEvent.click(screen.getByRole('button', { name: /copy contribution page link/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copied contribution page link/i })).toBeEnabled();
    });
    expect(screen.queryByRole('button', { name: /copy contribution page link/i })).toBeNull();
    expect(mockClipboard.writeText.mock.calls).toEqual([[`${page.revenue_program.slug}.${domain}/${page.slug}`]]);
  });
});
