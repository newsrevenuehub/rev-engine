import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ContributionDetailActions, { ContributionDetailActionsProps } from './ContributionDetailActions';
import { useContribution } from 'hooks/useContribution';

jest.mock('hooks/useContribution');

function tree(props?: Partial<ContributionDetailActionsProps>) {
  return render(<ContributionDetailActions contributionId={123} {...props} />);
}

describe('ContributionDetailActions', () => {
  const useContributionMock = jest.mocked(useContribution);

  beforeEach(() => {
    useContributionMock.mockReturnValue({
      cancelMutation: { mutateAsync: jest.fn() } as any,
      contribution: {} as any,
      isError: false,
      isFetching: false
    });
  });

  it('shows a menu', () => {
    tree();
    userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByRole('menu')).toBeVisible();
  });

  describe('The cancel menu item', () => {
    it.each([
      ['disabled', false],
      ['enabled', true]
    ])("is disabled if the contribution isn't cancelable", (_, is_cancelable) => {
      useContributionMock.mockReturnValue({
        cancelMutation: {} as any,
        contribution: { is_cancelable } as any,
        isError: false,
        isFetching: false
      });
      tree();
      userEvent.click(screen.getByRole('button', { name: 'Actions' }));
      expect(screen.getByRole('menuitem', { name: 'Cancel Contribution' })).toHaveAttribute(
        'aria-disabled',
        (!is_cancelable).toString()
      );
    });

    it('is disabled if a cancel request is in progress, even if the contribution is cancelable', () => {
      useContributionMock.mockReturnValue({
        cancelMutation: { isLoading: true } as any,
        contribution: { is_cancelable: true } as any,
        isError: false,
        isFetching: false
      });
      tree();
      userEvent.click(screen.getByRole('button', { name: 'Actions' }));
      expect(screen.getByRole('menuitem', { name: 'Cancel Contribution' })).toHaveAttribute('aria-disabled', 'true');
    });

    it('shows a confirmation modal when clicked', async () => {
      useContributionMock.mockReturnValue({
        cancelMutation: {} as any,
        contribution: { is_cancelable: true } as any,
        isError: false,
        isFetching: false
      });
      tree();
      userEvent.click(screen.getByRole('button', { name: 'Actions' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      userEvent.click(screen.getByRole('menuitem', { name: 'Cancel Contribution' }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    describe('The confirmation modal', () => {
      let mutateAsync: jest.Mock;

      beforeEach(() => {
        mutateAsync = jest.fn();
        useContributionMock.mockReturnValue({
          cancelMutation: { mutateAsync } as any,
          contribution: { is_cancelable: true } as any,
          isError: false,
          isFetching: false
        });
      });

      it('responds to the close button', async () => {
        tree();
        userEvent.click(screen.getByRole('button', { name: 'Actions' }));
        userEvent.click(screen.getByRole('menuitem', { name: 'Cancel Contribution' }));
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        userEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      it('closes the modal if the user cancels', async () => {
        tree();
        userEvent.click(screen.getByRole('button', { name: 'Actions' }));
        userEvent.click(screen.getByRole('menuitem', { name: 'Cancel Contribution' }));
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        userEvent.click(screen.getByRole('button', { name: "No, Don't Cancel" }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      it('cancels the contribution and closes the modal if the user confirms they want to cancel the contribution', async () => {
        tree();
        userEvent.click(screen.getByRole('button', { name: 'Actions' }));
        userEvent.click(screen.getByRole('menuitem', { name: 'Cancel Contribution' }));
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        userEvent.click(screen.getByRole('button', { name: 'Yes, Cancel' }));
        expect(mutateAsync).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      it('is accessible', async () => {
        const { container } = tree();

        userEvent.click(screen.getByRole('button', { name: 'Actions' }));
        userEvent.click(screen.getByRole('menuitem', { name: 'Cancel Contribution' }));
        expect(await axe(container)).toHaveNoViolations();
      });
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
