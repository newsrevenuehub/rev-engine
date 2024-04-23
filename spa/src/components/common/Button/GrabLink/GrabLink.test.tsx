import { EditablePageContext, EditablePageContextResult } from 'hooks/useEditablePage';
import { axe } from 'jest-axe';
import { render, screen, fireEvent, waitFor } from 'test-utils';
import { pageLink, portalLink } from 'utilities/getPageLinks';

import GrabLink from './GrabLink';

const page = {
  revenue_program: {
    slug: 'news-revenue-hub'
  },
  slug: 'donate',
  published_date: '2021-11-18T21:51:53Z',
  payment_provider: {}
};

const mockClipboard = {
  writeText: jest.fn()
};

(global.navigator as any).clipboard = mockClipboard;

describe('GrabLink', () => {
  function tree(context?: Partial<EditablePageContextResult>) {
    return render(
      <EditablePageContext.Provider
        value={{
          deletePage: jest.fn(),
          isError: false,
          isLoading: false,
          page: page as any,
          pageChanges: {},
          setPageChanges: jest.fn(),
          ...context
        }}
      >
        <GrabLink />
      </EditablePageContext.Provider>
    );
  }

  it('renders nothing while the page is loading', () => {
    tree({ isError: false, isLoading: true, page: undefined });
    expect(document.body.textContent).toBe('');
  });

  it("doesn't render a grab link button if the page is not published", () => {
    tree({ page: { ...page, published_date: null } as any });
    const button = screen.queryByRole('button', { name: /grab link/i });
    expect(button).not.toBeInTheDocument();
  });

  it('renders a grab link button if the page is published', () => {
    tree({ page: page as any });
    const button = screen.getByRole('button', { name: /grab link/i });
    expect(button).toBeEnabled();
  });

  it('should open popup and have all information', () => {
    tree();

    const button = screen.getByRole('button', { name: /grab link/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    const contributionLabel = screen.getByText(/Contribution Page Link/i);
    expect(contributionLabel).toBeVisible();

    const contributorLabel = screen.getByText(/Contributor Portal Link/i);
    expect(contributorLabel).toBeVisible();

    const copyButtons = screen.queryAllByRole('button', { name: /copy/i });
    expect(copyButtons).toHaveLength(2);

    expect(screen.getByRole('textbox', { name: 'Contribution Page Link' })).toHaveValue(pageLink(page as any));
    expect(screen.getByRole('textbox', { name: 'Contributor Portal Link' })).toHaveValue(portalLink(page as any));
  });

  it('should open popup and copy link', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined);
    tree();

    const button = screen.getByRole('button', { name: /grab link/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    fireEvent.click(screen.getByRole('button', { name: /copy contribution page link/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copied contribution page link/i })).toBeEnabled();
    });
    expect(screen.queryByRole('button', { name: /copy contribution page link/i })).toBeNull();
    expect(mockClipboard.writeText.mock.calls).toEqual([[pageLink(page as any)]]);
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
