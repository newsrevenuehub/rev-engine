import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { act, render, screen, waitFor } from 'test-utils';
import { GENERIC_ERROR } from 'constants/textConstants';
import useContributionPageList from 'hooks/useContributionPageList';
import { useEditablePageContext } from 'hooks/useEditablePage';
import useUser from 'hooks/useUser';
import PublishButton from './PublishButton';
import { PLAN_LABELS } from 'constants/orgPlanConstants';

jest.mock('hooks/useContributionPageList');
jest.mock('hooks/useEditablePage');
jest.mock('hooks/useUser');
jest.mock('components/common/Modal/MaxPagesPublishedModal/MaxPagesPublishedModal');
jest.mock('./PublishedPopover/PublishedPopover');
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

const user = {
  organizations: [{ plan: { name: PLAN_LABELS.FREE } }]
};

describe('PublishButton', () => {
  const useEditablePageContextMock = useEditablePageContext as jest.Mock;
  const useContributionPageListMock = useContributionPageList as jest.Mock;
  const useUserMock = useUser as jest.Mock;

  function tree() {
    return render(<PublishButton />);
  }

  beforeEach(() => {
    useEditablePageContextMock.mockReturnValue({ isLoading: false, page: unpublishedPage });
    useContributionPageListMock.mockReturnValue({ userCanPublishPage: () => true });
    useUserMock.mockReturnValue({ user });
  });

  it('renders nothing if the page is not set', () => {
    useEditablePageContextMock.mockReturnValue({ isLoading: true, page: undefined });
    tree();
    expect(document.body.textContent).toBe('');
  });

  it('renders nothing if the user is not set', () => {
    useUserMock.mockReturnValue({ user: undefined });
    tree();
    expect(document.body.textContent).toBe('');
  });

  describe("When user and page are set, but a payment provider hasn't been verified", () => {
    beforeEach(() => useEditablePageContextMock.mockReturnValue({ page: disabledPage }));

    it('shows a disabled button', () => {
      tree();
      expect(screen.getByRole('button', { name: `Publish page ${disabledPage.name}` })).toBeDisabled();
    });

    it('shows a tooltip when the user points at the button', async () => {
      tree();
      userEvent.hover(screen.getByTestId('publish-button-wrapper'));
      await waitFor(() => {
        expect(screen.getByText(/Connect to Stripe to publish page/i)).toBeInTheDocument();
      });
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When user and page are set and a payment provider has been verified', () => {
    describe('When the page has already been published', () => {
      beforeEach(() => useEditablePageContextMock.mockReturnValue({ page: publishedPage }));

      it('shows an enabled button with label "Published"', () => {
        tree();
        expect(screen.getByRole('button', { name: `Published page ${publishedPage.name}` })).toBeEnabled();
      });

      it("doesn't show a tooltip when the user points at the button", async () => {
        tree();
        userEvent.hover(screen.getByTestId('publish-button-wrapper'));
        await act(() => Promise.resolve());
        expect(screen.queryByText(/Connect to Stripe to publish page/i)).not.toBeInTheDocument();
      });

      it('opens a popover with details when clicked', () => {
        tree();
        expect(screen.queryByTestId('mock-published-popover')).not.toBeInTheDocument();
        userEvent.click(screen.getByRole('button', { name: `Published page ${publishedPage.name}` }));
        expect(screen.getByTestId('mock-published-popover')).toBeInTheDocument();
      });

      it('closes the popover when the user closes it', () => {
        tree();
        userEvent.click(screen.getByRole('button', { name: `Published page ${publishedPage.name}` }));
        expect(screen.getByTestId('mock-published-popover')).toBeInTheDocument();
        userEvent.click(screen.getByText('PublishedPopover onClose'));
        expect(screen.queryByTestId('mock-published-popover')).not.toBeInTheDocument();
      });

      it('is accessible', async () => {
        const { container } = tree();

        expect(await axe(container)).toHaveNoViolations();
      });
    });

    describe('When the page has not been published yet', () => {
      beforeEach(() => useEditablePageContextMock.mockReturnValue({ isLoading: false, page: unpublishedPage }));

      describe('And the user can publish a new page', () => {
        beforeEach(() => {
          useContributionPageListMock.mockReturnValue({ userCanPublishPage: () => true });
        });

        it('shows an enabled button with label "Publish"', () => {
          tree();
          expect(screen.getByRole('button', { name: `Publish page ${unpublishedPage.name}` })).toBeEnabled();
        });

        it("doesn't show a tooltip when the user points at the button", async () => {
          tree();
          userEvent.hover(screen.getByTestId('publish-button-wrapper'));
          await act(() => Promise.resolve());
          expect(screen.queryByText(/Connect to Stripe to publish page/i)).not.toBeInTheDocument();
        });

        it('opens the publish modal when clicked', () => {
          tree();
          expect(screen.queryByTestId('mock-publish-modal')).not.toBeInTheDocument();
          userEvent.click(screen.getByRole('button', { name: `Publish page ${publishedPage.name}` }));
          expect(screen.getByTestId('mock-publish-modal')).toBeInTheDocument();
        });

        it('closes the publish modal if the user closes it', () => {
          tree();
          userEvent.click(screen.getByRole('button', { name: `Publish page ${publishedPage.name}` }));
          expect(screen.getByTestId('mock-publish-modal')).toBeInTheDocument();
          userEvent.click(screen.getByText('PublishModal onClose'));
          expect(screen.queryByTestId('mock-publish-modal')).not.toBeInTheDocument();
        });

        it('changes the published_date of the page when the modal requests the page be published', async () => {
          const savePageChanges = jest.fn();

          useEditablePageContextMock.mockReturnValue({ savePageChanges, isLoading: false, page: unpublishedPage });
          tree();
          userEvent.click(screen.getByRole('button', { name: `Publish page ${publishedPage.name}` }));
          userEvent.click(screen.getByText('onPublish'));
          expect(savePageChanges.mock.calls).toEqual([[{ published_date: expect.any(String), slug: 'mock-slug' }]]);
          // Allow pending re-renders to complete.
          await act(() => Promise.resolve());
        });

        it('shows an alert if publishing fails', async () => {
          const savePageChanges = jest.fn();

          savePageChanges.mockRejectedValue(new Error());
          useEditablePageContextMock.mockReturnValue({ savePageChanges, isLoading: false, page: unpublishedPage });
          tree();
          userEvent.click(screen.getByRole('button', { name: `Publish page ${publishedPage.name}` }));
          userEvent.click(screen.getByText('onPublish'));
          expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_ERROR);
        });

        it('is accessible', async () => {
          const { container } = tree();

          expect(await axe(container)).toHaveNoViolations();
        });

        describe('When publishing succeeds', () => {
          it('shows the publish success modal', async () => {
            const savePageChanges = jest.fn();

            useEditablePageContextMock.mockReturnValue({ savePageChanges, isLoading: false, page: unpublishedPage });
            tree();
            userEvent.click(screen.getByRole('button', { name: `Publish page ${publishedPage.name}` }));
            userEvent.click(screen.getByText('onPublish'));
            expect(await screen.findByText('Successfully Published Page')).toBeVisible();
          });

          it('closes the publish modal', async () => {
            const savePageChanges = jest.fn();

            useEditablePageContextMock.mockReturnValue({ savePageChanges, isLoading: false, page: unpublishedPage });
            tree();
            userEvent.click(screen.getByRole('button', { name: `Publish page ${publishedPage.name}` }));
            userEvent.click(screen.getByText('onPublish'));
            await act(() => Promise.resolve());
            expect(screen.queryByTestId('mock-publish-modal')).not.toBeInTheDocument();
          });
        });
      });

      describe("But the user can't publish new pages", () => {
        beforeEach(() => useContributionPageListMock.mockReturnValue({ userCanPublishPage: () => false }));

        it('shows an enabled button with label "Publish"', () => {
          tree();
          expect(screen.getByRole('button', { name: `Publish page ${unpublishedPage.name}` })).toBeEnabled();
        });

        it("doesn't show a tooltip when the user points at the button", async () => {
          tree();
          userEvent.hover(screen.getByTestId('publish-button-wrapper'));
          await act(() => Promise.resolve());
          expect(screen.queryByText(/Connect to Stripe to publish page/i)).not.toBeInTheDocument();
        });

        it('shows the max published pages modal when clicked', () => {
          tree();
          expect(screen.queryByTestId('mock-max-pages-published-modal')).not.toBeInTheDocument();
          userEvent.click(screen.getByRole('button', { name: `Publish page ${unpublishedPage.name}` }));
          expect(screen.getByTestId('mock-max-pages-published-modal')).toBeInTheDocument();
        });

        it('closes the max published pages modal when the user clicks it', () => {
          tree();
          userEvent.click(screen.getByRole('button', { name: `Publish page ${unpublishedPage.name}` }));
          expect(screen.getByTestId('mock-max-pages-published-modal')).toBeInTheDocument();
          userEvent.click(screen.getByText('MaxPagesPublishedModal onClose'));
          expect(screen.queryByTestId('mock-max-pages-published-modal')).not.toBeInTheDocument();
        });

        it('is accessible', async () => {
          const { container } = tree();

          expect(await axe(container)).toHaveNoViolations();
        });
      });
    });
  });
});
