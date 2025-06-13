import { axe } from 'jest-axe';
import { render, screen, waitFor } from 'test-utils';
import ContributionDetailActions, { ContributionDetailActionsProps } from './ContributionDetailActions';
import { useContribution } from 'hooks/useContribution';
import userEvent from '@testing-library/user-event';

jest.mock('hooks/useContribution');

function tree(props?: Partial<ContributionDetailActionsProps>) {
  return render(<ContributionDetailActions contributionId={123} {...props} />);
}

describe('ContributionDetailActions', () => {
  const useContributionMock = jest.mocked(useContribution);

  beforeEach(() => {
    useContributionMock.mockReturnValue({
      cancelContribution: jest.fn(),
      contribution: {} as any,
      isError: false,
      isLoading: false
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
        cancelContribution: jest.fn(),
        contribution: { is_cancelable } as any,
        isError: false,
        isLoading: false
      });
      tree();
      userEvent.click(screen.getByRole('button', { name: 'Actions' }));
      expect(screen.getByRole('menuitem', { name: 'Cancel Contribution' })).toHaveAttribute(
        'aria-disabled',
        (!is_cancelable).toString()
      );
    });

    it('shows a confirmation modal when clicked', async () => {
      useContributionMock.mockReturnValue({
        cancelContribution: jest.fn(),
        contribution: { is_cancelable: true } as any,
        isError: false,
        isLoading: false
      });
      tree();
      userEvent.click(screen.getByRole('button', { name: 'Actions' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      userEvent.click(screen.getByRole('menuitem', { name: 'Cancel Contribution' }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    describe('The confirmation modal', () => {
      let cancelContribution: jest.Mock;

      beforeEach(() => {
        cancelContribution = jest.fn();
        useContributionMock.mockReturnValue({
          cancelContribution,
          contribution: { is_cancelable: true } as any,
          isError: false,
          isLoading: false
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
        expect(cancelContribution).toHaveBeenCalledTimes(1);
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
