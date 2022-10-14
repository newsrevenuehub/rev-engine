import { axe } from 'jest-axe';
import { render, screen, fireEvent, waitFor } from 'test-utils';
import { pageLink, portalLink } from 'utilities/getPageLinks';

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

    expect(screen.getByRole('textbox', { name: 'Contribution Page Link' })).toHaveValue(pageLink(page));
    expect(screen.getByRole('textbox', { name: 'Contributor Portal Link' })).toHaveValue(portalLink(page));
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
    expect(mockClipboard.writeText.mock.calls).toEqual([[pageLink(page)]]);
  });

  it('should be accessible', async () => {
    const { container } = render(<GrabLink page={page} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
