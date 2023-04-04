import {
  USER_ROLE_HUB_ADMIN_TYPE,
  USER_ROLE_ORG_ADMIN_TYPE,
  USER_ROLE_RP_ADMIN_TYPE,
  USER_SUPERUSER_TYPE
} from 'constants/authConstants';
import { DONATIONS_CORE_UPGRADE_CLOSED } from 'hooks/useSessionState';
import useUser from 'hooks/useUser';
import { fireEvent, render, screen } from 'test-utils';
import DonationUpgradePrompts from './DonationUpgradePrompts';

jest.mock('hooks/useUser');
jest.mock('./DonationCoreUpgradePrompt/DonationCoreUpgradePrompt');

const mockUser = {
  organizations: [{ plan: { name: 'FREE' } }],
  revenue_programs: [{ payment_provider_stripe_verified: true }],
  role_type: [USER_ROLE_ORG_ADMIN_TYPE]
};

function tree() {
  return render(<DonationUpgradePrompts />);
}

describe('DonationUpgradePrompts', () => {
  const useUserMock = useUser as jest.Mock;

  beforeEach(() => {
    useUserMock.mockReturnValue({ user: mockUser });
    window.sessionStorage.clear();
  });

  afterAll(() => window.sessionStorage.clear());

  describe("When the user is an org admin, on the free plan, their organization is Stripe connected, and hasn't previously closed the prompt", () => {
    it('shows a Core upgrade prompt', () => {
      tree();
      expect(screen.getByTestId('mock-donation-core-upgrade-prompt')).toBeInTheDocument();
    });

    it('hides the prompt when closed', () => {
      tree();
      expect(screen.getByTestId('mock-donation-core-upgrade-prompt')).toBeInTheDocument();
      fireEvent.click(screen.getByText('onClose'));
      expect(screen.queryByTestId('mock-donation-core-upgrade-prompt')).not.toBeInTheDocument();
    });

    it('sets session state to remember that the prompt has been closed', () => {
      tree();
      expect(window.sessionStorage.getItem(DONATIONS_CORE_UPGRADE_CLOSED)).toBeNull();
      fireEvent.click(screen.getByText('onClose'));
      expect(JSON.parse(window.sessionStorage.getItem(DONATIONS_CORE_UPGRADE_CLOSED)!)).toBe(true);
    });
  });

  it.each([
    ['Hub admin', USER_ROLE_HUB_ADMIN_TYPE],
    ['revenue program admin', USER_ROLE_RP_ADMIN_TYPE],
    ['superuser', USER_SUPERUSER_TYPE]
  ])("doesn't show the Core upgrade prompt if the user is a %s", (label, role) => {
    useUserMock.mockReturnValue({ user: { ...mockUser, role_type: [role] } });
    tree();
    expect(screen.queryByTestId('mock-donation-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it.each(['CORE', 'PLUS'])("doesn't show the Core upgrade prompt if the user's org is on the %s plan", (name) => {
    useUserMock.mockReturnValue({ user: { ...mockUser, organizations: [{ plan: { name } }] } });
    tree();
    expect(screen.queryByTestId('mock-donation-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it("doesn't show the Core upgrade prompt if the user's RP is not connected to Stripe", () => {
    useUserMock.mockReturnValue({
      user: { ...mockUser, revenue_programs: [{ payment_provider_stripe_verified: false }] }
    });
    tree();
    expect(screen.queryByTestId('mock-donation-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it("doesn't show the Core upgrade prompt if the user's RP Stripe connection status is undefined", () => {
    useUserMock.mockReturnValue({
      user: { ...mockUser, revenue_programs: [{}] }
    });
    tree();
    expect(screen.queryByTestId('mock-donation-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it("doesn't show the Core upgrade prompt if session state says that it has been closed", () => {
    window.sessionStorage.setItem(DONATIONS_CORE_UPGRADE_CLOSED, 'true');
    tree();
    expect(screen.queryByTestId('mock-donation-core-upgrade-prompt')).not.toBeInTheDocument();
  });
});
