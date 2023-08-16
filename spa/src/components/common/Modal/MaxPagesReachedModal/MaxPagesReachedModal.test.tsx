import { CORE_UPGRADE_URL, PRICING_URL } from 'constants/helperUrls';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import { axe } from 'jest-axe';
import { SELF_UPGRADE_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import useUser from 'hooks/useUser';
import { fireEvent, render, screen } from 'test-utils';
import MaxPagesReachedModal, { MaxPagesReachedModalProps } from './MaxPagesReachedModal';
import { SETTINGS } from 'routes';

jest.mock('hooks/useUser');

function tree(props?: Partial<MaxPagesReachedModalProps>) {
  return render(<MaxPagesReachedModal currentPlan="FREE" onClose={jest.fn()} {...props} />);
}

describe('MaxPagesReachedModal', () => {
  const useUserMock = jest.mocked(useUser);

  beforeEach(() => useUserMock.mockReturnValue({ user: { flags: [] }, isError: false, isLoading: false } as any));

  it('displays nothing if the open prop is false', () => {
    tree({ open: false });
    expect(document.body).toHaveTextContent('');
  });

  it('displays a modal when open', () => {
    tree({ open: true });
    expect(screen.getByText('Max Pages Reached')).toBeVisible();
  });

  it('shows a message stating that the user has run out of pages for their plan', () => {
    tree({ currentPlan: PLAN_NAMES.FREE, open: true });
    expect(screen.getByTestId('plan-limit')).toHaveTextContent(
      "You've reached the maximum number of pages for the Free tier."
    );
  });

  it('shows a message recommending the recommendedPlan prop', () => {
    tree({ recommendedPlan: 'PLUS', open: true });
    expect(screen.getByTestId('recommendation')).toHaveTextContent('Want to create more pages? Check out Plus.');
  });

  describe('The link to upgrade', () => {
    describe("When the user doesn't have the self-upgrade feature flag", () => {
      it('goes to the Core upgrade URL if the Core plan is recommended', () => {
        tree({ open: true, recommendedPlan: 'CORE' });

        const link = screen.getByRole('link', { name: 'Upgrade' });

        expect(link).toHaveAttribute('href', CORE_UPGRADE_URL);
        expect(link).toHaveAttribute('target', '_blank');
      });

      it('goes to the pricing URL if the Plus plan is recommended', () => {
        tree({ open: true, recommendedPlan: 'PLUS' });

        const link = screen.getByRole('link', { name: 'Upgrade' });

        expect(link).toHaveAttribute('href', PRICING_URL);
        expect(link).toHaveAttribute('target', '_blank');
      });
    });

    describe('When the user does have the self-upgrade feature flag', () => {
      beforeEach(() =>
        useUserMock.mockReturnValue({
          user: { flags: [{ name: SELF_UPGRADE_ACCESS_FLAG_NAME }] } as any,
          isError: false,
          isLoading: false,
          refetch: jest.fn()
        })
      );

      it('goes to the subscription page if the Core plan is recommended', () => {
        tree({ open: true, recommendedPlan: 'CORE' });

        const link = screen.getByRole('button', { name: 'Upgrade' });

        expect(link).toHaveAttribute('href', SETTINGS.SUBSCRIPTION);
      });

      it('goes to the pricing URL if the Plus plan is recommended', () => {
        tree({ open: true, recommendedPlan: 'PLUS' });

        const link = screen.getByRole('link', { name: 'Upgrade' });

        expect(link).toHaveAttribute('href', PRICING_URL);
        expect(link).toHaveAttribute('target', '_blank');
      });
    });
  });

  it('calls the onClose prop when the modal is closed', () => {
    const onClose = jest.fn();

    tree({ onClose, open: true });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toBeCalled();
  });

  it('calls the onClose prop when the Maybe Later button is clicked', () => {
    const onClose = jest.fn();

    tree({ onClose, open: true });
    fireEvent.click(screen.getByRole('button', { name: 'Maybe Later' }));
    expect(onClose).toBeCalled();
  });

  it('is accessible', async () => {
    const { container } = tree({ open: true });

    expect(await axe(container)).toHaveNoViolations();
  });
});
