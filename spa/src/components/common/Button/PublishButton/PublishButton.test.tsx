import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { useContributionPage } from 'hooks/useContributionPage';
import { act, render, screen, waitFor } from 'test-utils';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import { pageLink } from 'utilities/getPageLinks';
import PublishButton, { PublishButtonProps } from './PublishButton';
import { GENERIC_ERROR } from 'constants/textConstants';

jest.mock('hooks/useContributionPage');
jest.mock('./PublishModal/PublishModal');

const unpublishedPage = {
  name: 'Contribution page',
  revenue_program: {
    slug: 'news-revenue-hub'
  },
  payment_provider: {
    stripe_verified: true
  }
};

const disabledPage = {
  ...unpublishedPage,
  payment_provider: {}
};

const publishedPage = {
  ...unpublishedPage,
  slug: 'published-page',
  published_date: '2021-11-18T21:51:53Z'
};

function tree(props?: Partial<PublishButtonProps>) {
  return render(<PublishButton page={unpublishedPage as any} {...props} />);
}

describe('PublishButton', () => {
  const useContributionPageMock = useContributionPage as jest.Mock;

  beforeEach(() => {
    useContributionPageMock.mockReturnValue({ isLoading: false, updatePage: jest.fn() });
  });

  it('renders nothing if the page is not set', () => {
    tree({ page: undefined });
    expect(document.body.textContent).toBe('');
  });

  it('should render publish button', () => {
    tree();
    expect(screen.getByRole('button', { name: /Publish/i })).toBeEnabled();
  });

  it('should open publish modal when clicked', async () => {
    tree();

    const button = screen.getByRole('button', { name: /Publish/i });

    expect(button).toBeEnabled();
    userEvent.click(button);
    await waitFor(() => expect(screen.getByTestId('mock-publish-modal')).toBeVisible());
  });

  describe('When the publish modal signals it wants to publish the page', () => {
    it('updates the page', async () => {
      const updatePage = jest.fn();

      useContributionPageMock.mockReturnValue({ updatePage, isLoading: false });
      tree({ setPage: jest.fn() });
      userEvent.click(screen.getByRole('button', { name: /Publish/i }));
      expect(updatePage).not.toBeCalled();
      userEvent.click(screen.getByText('onPublish'));
      expect(updatePage.mock.calls).toEqual([[{ published_date: expect.any(String), slug: 'mock-slug' }]]);

      // Allow pending re-renders to complete.
      await act(() => Promise.resolve());
    });

    it('shows the published modal if the update succeeds', async () => {
      tree({ setPage: jest.fn() });
      userEvent.click(screen.getByRole('button', { name: /Publish/i }));
      userEvent.click(screen.getByText('onPublish'));
      expect(await screen.findByText('Successfully Published Page')).toBeVisible();
      expect(screen.queryAllByRole('alert').length).toBe(0);
    });

    it("displays an error message if the update doesn't succeed", async () => {
      useContributionPageMock.mockReturnValue({
        isLoading: false,
        updatePage: () => {
          throw new Error('test-error');
        }
      });
      tree({ setPage: jest.fn() });
      userEvent.click(screen.getByRole('button', { name: /Publish/i }));
      userEvent.click(screen.getByText('onPublish'));
      expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_ERROR);
    });

    it('calls setPage with the changed page data', async () => {
      const setPage = jest.fn();

      tree({ setPage });
      userEvent.click(screen.getByRole('button', { name: /Publish/i }));
      userEvent.click(screen.getByText('onPublish'));
      await waitFor(() => expect(setPage).toBeCalled());
      expect(setPage.mock.calls).toEqual([
        [{ ...unpublishedPage, published_date: expect.any(String), slug: 'mock-slug' }]
      ]);
    });

    it("updates the browser's location to match the new page slug", async () => {
      const replaceStateSpy = jest.spyOn(window.history, 'replaceState');

      tree({ setPage: jest.fn() });
      userEvent.click(screen.getByRole('button', { name: /Publish/i }));
      userEvent.click(screen.getByText('onPublish'));
      await waitFor(() => expect(replaceStateSpy).toBeCalled());
      expect(replaceStateSpy.mock.calls).toEqual([
        [null, '', `/edit/${unpublishedPage.revenue_program.slug}/mock-slug/`]
      ]);
    });
  });

  it('should be disabled if no payment provider (stripe)', () => {
    tree({ page: disabledPage as any });
    expect(screen.getByRole('button', { name: /Publish/i })).toBeDisabled();
  });

  it('should show tooltip if button disabled and hovered', async () => {
    tree({ page: disabledPage as any });
    userEvent.hover(screen.getByTestId('publish-button-wrapper'));
    await waitFor(() => {
      expect(screen.getByText(/Connect to Stripe to publish page/i)).toBeInTheDocument();
    });
  });

  it('should show enabled published button if published_date', () => {
    tree({ page: publishedPage as any });
    expect(screen.getByRole('button', { name: /Published/i })).toBeEnabled();
  });

  it('should open popover if published and clicked', async () => {
    tree({ page: publishedPage as any });

    const button = screen.getByRole('button', { name: /Published/i });

    expect(button).toBeEnabled();
    userEvent.click(button);
    await waitFor(() => expect(screen.getByText(/live/i)).toBeVisible());

    const liveSince = `${formatDatetimeForDisplay(publishedPage.published_date)} at ${formatDatetimeForDisplay(
      publishedPage.published_date,
      true
    )}`;

    expect(screen.getByText(liveSince)).toBeVisible();

    const goToPageButton = screen.getByRole('link', { name: /page link/i });

    expect(goToPageButton).toBeEnabled();
    expect(goToPageButton).toHaveAttribute('href', `//${pageLink(publishedPage)}`);
  });

  it('should be accessible', async () => {
    const { container } = tree({ page: publishedPage as any });

    expect(await axe(container)).toHaveNoViolations();
  });
});
