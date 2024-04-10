import {
  USER_ROLE_HUB_ADMIN_TYPE,
  USER_ROLE_ORG_ADMIN_TYPE,
  USER_ROLE_RP_ADMIN_TYPE,
  USER_SUPERUSER_TYPE
} from 'constants/authConstants';
import { FAQ_URL, HELP_URL } from 'constants/helperUrls';
import {
  SIDEBAR_CONSULTING_UPGRADE_CLOSED,
  SIDEBAR_CORE_UPGRADE_CLOSED,
  SIDEBAR_PLUS_UPGRADE_CLOSED
} from 'hooks/useSessionState';
import useUser from 'hooks/useUser';
import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import DashboardSidebarFooter from './DashboardSidebarFooter';

jest.mock('hooks/useUser');
jest.mock('./SidebarUpgradePrompt/SidebarUpgradePrompt');

const mockUser = {
  organizations: [{ plan: { name: 'FREE' } }],
  revenue_programs: [{ payment_provider_stripe_verified: true }],
  role_type: [USER_ROLE_ORG_ADMIN_TYPE]
};

describe('DashboardSidebarFooter', () => {
  const useUserMock = useUser as jest.Mock;

  beforeEach(() => {
    useUserMock.mockReturnValue({ user: mockUser });
    window.sessionStorage.clear();
  });

  afterAll(() => window.sessionStorage.clear());

  function tree() {
    return render(
      <div role="list">
        <DashboardSidebarFooter />
      </div>
    );
  }

  describe.each([
    ['FREE', 'Core', SIDEBAR_CORE_UPGRADE_CLOSED],
    ['CORE', 'Plus', SIDEBAR_PLUS_UPGRADE_CLOSED],
    ['PLUS', 'Consulting', SIDEBAR_CONSULTING_UPGRADE_CLOSED]
  ])(
    "When the user is an org admin, on the %s plan, their organization is Stripe connected, and hasn't previously closed the prompt",
    (plan, promptType, sessionKey) => {
      beforeEach(() => {
        useUserMock.mockReturnValue({ user: { ...mockUser, organizations: [{ plan: { name: plan } }] } });
      });

      it(`shows a ${promptType} upgrade prompt`, () => {
        tree();
        const prompt = screen.getByTestId('mock-sidebar-upgrade-prompt');
        expect(prompt).toBeInTheDocument();
        expect(prompt.dataset.currentplan).toBe(plan);
      });

      it('hides the prompt when closed', () => {
        tree();
        expect(screen.getByTestId('mock-sidebar-upgrade-prompt')).toBeInTheDocument();
        fireEvent.click(screen.getByText('onClose'));
        expect(screen.queryByTestId('mock-sidebar-upgrade-prompt')).not.toBeInTheDocument();
      });

      it('sets session state to remember that the prompt has been closed', () => {
        tree();
        expect(window.sessionStorage.getItem(sessionKey)).toBeNull();
        fireEvent.click(screen.getByText('onClose'));
        expect(JSON.parse(window.sessionStorage.getItem(sessionKey)!)).toBe(true);
      });
    }
  );

  it.each([
    ['Hub admin', USER_ROLE_HUB_ADMIN_TYPE],
    ['revenue program admin', USER_ROLE_RP_ADMIN_TYPE],
    ['superuser', USER_SUPERUSER_TYPE]
  ])("doesn't show the Core upgrade prompt if the user is a %s", (label, role) => {
    useUserMock.mockReturnValue({ user: { ...mockUser, role_type: [role] } });
    tree();
    expect(screen.queryByTestId('mock-sidebar-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it.each(['CORE', 'PLUS'])("doesn't show the Core upgrade prompt if the user's org is on the %s plan", (name) => {
    useUserMock.mockReturnValue({ user: { ...mockUser, organizations: [{ plan: { name } }] } });
    tree();
    expect(screen.queryByTestId('mock-sidebar-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it("doesn't show the Core upgrade prompt if the user's RP is not connected to Stripe", () => {
    useUserMock.mockReturnValue({
      user: { ...mockUser, revenue_programs: [{ payment_provider_stripe_verified: false }] }
    });
    tree();
    expect(screen.queryByTestId('mock-sidebar-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it("doesn't show the Core upgrade prompt if the user's RP Stripe connection status is undefined", () => {
    useUserMock.mockReturnValue({
      user: { ...mockUser, revenue_programs: [{}] }
    });
    tree();
    expect(screen.queryByTestId('mock-sidebar-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it("doesn't show the Core upgrade prompt if session state says that it has been closed", () => {
    window.sessionStorage.setItem(SIDEBAR_CORE_UPGRADE_CLOSED, 'true');
    tree();
    expect(screen.queryByTestId('mock-sidebar-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it('renders an FAQ link that opens in a new tab', () => {
    tree();

    const faqLink = screen.getByRole('listitem', { name: 'FAQ' });

    expect(faqLink).toBeVisible();
    expect(faqLink).toHaveAttribute('href', FAQ_URL);
    expect(faqLink).toHaveAttribute('target', '_blank');
  });

  it('renders a help link that opens in a new tab', () => {
    tree();

    const helpLink = screen.getByRole('listitem', { name: 'Help' });

    expect(helpLink).toBeVisible();
    expect(helpLink).toHaveAttribute('href', HELP_URL);
    expect(helpLink).toHaveAttribute('target', '_blank');
  });

  it('is accessible', async () => {
    // It looks like axe does not like us putting `role="listitem"` directly on
    // an <a> element (aria-allowed-role). The other rule violations disabled
    // here cascade from there.
    //
    // See
    // https://dequeuniversity.com/rules/axe/4.4/aria-allowed-role?application=axeAPI

    const { container } = tree();

    expect(
      await axe(container, {
        rules: {
          'aria-allowed-role': { enabled: false },
          'aria-required-children': { enabled: false },
          'aria-required-parent': { enabled: false }
        }
      })
    ).toHaveNoViolations();
  });
});
