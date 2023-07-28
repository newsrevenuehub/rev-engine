import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import Subscription from './Subscription';
import useUser from 'hooks/useUser';
import { PLAN_LABELS } from 'constants/orgPlanConstants';
import useQueryString from 'hooks/useQueryString';

jest.mock('hooks/useQueryString');
jest.mock('hooks/useUser');
jest.mock('./ManageSubscription');
jest.mock('./UpgradePlan');

function tree() {
  return render(<Subscription />);
}

describe('Subscription', () => {
  const useQueryStringMock = jest.mocked(useQueryString);
  const useUserMock = jest.mocked(useUser);

  beforeEach(() => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
      user: {
        id: 'mock-user-id',
        organizations: [{ id: 'mock-org-id', plan: { name: PLAN_LABELS.FREE } }, { plan: { name: PLAN_LABELS.CORE } }]
      } as any
    });
  });

  it('displays nothing if the user is not available in context', () => {
    useUserMock.mockReturnValue({ isError: false, isLoading: true, refetch: jest.fn() });
    tree();
    expect(document.body.textContent).toBe('');
  });

  it('displays nothing if the user in context has no organizations', () => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: true,
      refetch: jest.fn(),
      user: { organizations: [] } as any
    });
    tree();
    expect(document.body.textContent).toBe('');
  });

  it("displays the plan the user's first organization has", () => {
    tree();
    expect(screen.getByText('Free Tier')).toBeVisible();
  });

  it('displays a ManageSubscription component', () => {
    tree();

    const manageSub = screen.queryByTestId('mock-manage-subscription');

    expect(manageSub).toBeInTheDocument();
    expect(manageSub?.dataset.organizationId).toBe('mock-org-id');
    expect(manageSub?.dataset.userId).toBe('mock-user-id');
  });

  it('displays an UpgradePlan component', () => {
    tree();

    const upgradePlan = screen.queryByTestId('mock-upgrade-plan');

    expect(upgradePlan).toBeInTheDocument();
    expect(upgradePlan?.dataset.organizationId).toBe('mock-org-id');
    expect(upgradePlan?.dataset.userId).toBe('mock-user-id');
  });

  it("doesn't show a PlanChangePendingModal", () => {
    tree();
    expect(screen.queryByText('Upgrade Pending')).not.toBeInTheDocument();
  });

  describe('When a pendingPlanUpgrade query param is present', () => {
    beforeEach(() => {
      useQueryStringMock.mockImplementation((name) => {
        if (name === 'pendingPlanUpgrade') {
          return 'CORE';
        }

        return '';
      });
    });

    it('shows a pending plan change modal', () => {
      tree();
      expect(screen.getByText('Upgrade Pending')).toBeVisible();
    });

    it('closes the modal when the user closes it', () => {
      tree();
      expect(screen.getByText('Upgrade Pending')).toBeVisible();
      fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
      expect(screen.queryByText('Upgrade Pending')).not.toBeInTheDocument();
    });

    it('ignores any query param value other than CORE', () => {
      const replaceStateSpy = jest.spyOn(window.history, 'replaceState');

      useQueryStringMock.mockImplementation((name) => {
        if (name === 'pendingPlanUpgrade') {
          return 'PLUS';
        }

        return '';
      });
      tree();
      expect(screen.queryByText('Upgrade Pending')).not.toBeInTheDocument();
      expect(replaceStateSpy).not.toBeCalled();
    });

    it('removes the query param from the URL', () => {
      const replaceStateSpy = jest.spyOn(window.history, 'replaceState');

      tree();
      expect(replaceStateSpy.mock.calls).toEqual([[null, '', 'http://localhost/']]);
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
