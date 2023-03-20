import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { act, render, screen, waitFor } from 'test-utils';
import { GENERIC_ERROR } from 'constants/textConstants';
import { EditablePageContext, EditablePageContextResult } from 'hooks/useEditablePage';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import { pageLink } from 'utilities/getPageLinks';
import PublishButton from './PublishButton';

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

describe('PublishButton', () => {
  function tree(context?: Partial<EditablePageContextResult>) {
    return render(
      <EditablePageContext.Provider
        value={{
          deletePage: jest.fn(),
          isError: false,
          isLoading: false,
          page: unpublishedPage as any,
          pageChanges: {},
          savePageChanges: jest.fn(),
          setPageChanges: jest.fn(),
          ...context
        }}
      >
        <PublishButton />
      </EditablePageContext.Provider>
    );
  }

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
    it('save changes to the page', async () => {
      const savePageChanges = jest.fn();

      tree({ savePageChanges });
      userEvent.click(screen.getByRole('button', { name: /Publish/i }));
      expect(savePageChanges).not.toBeCalled();
      userEvent.click(screen.getByText('onPublish'));
      expect(savePageChanges.mock.calls).toEqual([[{ published_date: expect.any(String), slug: 'mock-slug' }]]);
      // Allow pending re-renders to complete.
      await act(() => Promise.resolve());
    });

    it('shows the published modal if the update succeeds', async () => {
      tree();
      userEvent.click(screen.getByRole('button', { name: /Publish/i }));
      userEvent.click(screen.getByText('onPublish'));
      expect(await screen.findByText('Successfully Published Page')).toBeVisible();
      expect(screen.queryAllByRole('alert').length).toBe(0);
    });

    it("displays an error message if the update doesn't succeed", async () => {
      const savePageChanges = jest.fn();

      savePageChanges.mockRejectedValue(new Error());
      tree({ savePageChanges });
      userEvent.click(screen.getByRole('button', { name: /Publish/i }));
      userEvent.click(screen.getByText('onPublish'));
      expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_ERROR);
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

    expect(screen.getByTestId('publish-date')).toBeVisible();

    // Very unclear why, but using .toHaveTextContent() fails... but only in CI.
    expect(screen.getByTestId('publish-date').textContent).toBe(liveSince);

    const goToPageButton = screen.getByRole('link', { name: /page link/i });

    expect(goToPageButton).toBeEnabled();
    expect(goToPageButton).toHaveAttribute('href', `//${pageLink(publishedPage)}`);
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeVisible();
  });

  it('should be accessible', async () => {
    const { container } = tree({ page: publishedPage as any });

    expect(await axe(container)).toHaveNoViolations();
  });
});
