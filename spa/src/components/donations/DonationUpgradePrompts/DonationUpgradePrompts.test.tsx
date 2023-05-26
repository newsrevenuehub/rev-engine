import {
  USER_ROLE_HUB_ADMIN_TYPE,
  USER_ROLE_ORG_ADMIN_TYPE,
  USER_ROLE_RP_ADMIN_TYPE,
  USER_SUPERUSER_TYPE
} from 'constants/authConstants';
import { DONATIONS_CORE_UPGRADE_CLOSED } from 'hooks/useSessionState';
import useUser from 'hooks/useUser';
import { act, fireEvent, render, screen, waitFor } from 'test-utils';
import DonationUpgradePrompts from './DonationUpgradePrompts';
import useContributionPageList from 'hooks/useContributionPageList';

jest.mock('hooks/useContributionPageList');
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
  const useUserMock = jest.mocked(useUser);
  const useContributionPageListMock = jest.mocked(useContributionPageList);

  beforeEach(() => {
    useContributionPageListMock.mockReturnValue({
      createPage: jest.fn(),
      pages: [
        {
          published_date: new Date('1/1/2001')
        }
      ] as any,
      error: undefined,
      isError: false,
      isLoading: false,
      newPageProperties: jest.fn(),
      userCanCreatePage: jest.fn(),
      userCanPublishPage: jest.fn()
    });
    useUserMock.mockReturnValue({ user: mockUser } as any);
    window.sessionStorage.clear();
  });

  afterAll(() => window.sessionStorage.clear());

  describe("When the user is an org admin, on the free plan, their organization is Stripe connected, has at least one published page, and hasn't previously closed the prompt", () => {
    it('shows a Core upgrade prompt', () => {
      tree();
      expect(screen.getByTestId('mock-donation-core-upgrade-prompt')).toBeInTheDocument();
    });

    describe('Prompt Highlight', () => {
      it('shows a highlight', () => {
        tree();
        expect(screen.getByTestId('prompt-highlight-true')).toBeInTheDocument();
      });

      it('hides the highlight after 1 second', async () => {
        jest.useFakeTimers();
        tree();
        expect(screen.getByTestId('prompt-highlight-true')).toBeInTheDocument();
        act(() => {
          jest.runAllTimers();
        });
        await waitFor(() => {
          expect(screen.getByTestId('prompt-highlight-false')).toBeInTheDocument();
        });

        jest.useRealTimers();
      });
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
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
      user: { ...mockUser, role_type: [role] } as any
    });
    tree();
    expect(screen.queryByTestId('mock-donation-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it.each(['CORE', 'PLUS'])("doesn't show the Core upgrade prompt if the user's org is on the %s plan", (name) => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
      user: { ...mockUser, organizations: [{ plan: { name } }] } as any
    });
    tree();
    expect(screen.queryByTestId('mock-donation-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it("doesn't show the Core upgrade prompt if the user's RP is not connected to Stripe", () => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
      user: { ...mockUser, revenue_programs: [{ payment_provider_stripe_verified: false }] } as any
    });
    tree();
    expect(screen.queryByTestId('mock-donation-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it("doesn't show the Core upgrade prompt if the user's RP Stripe connection status is undefined", () => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
      user: { ...mockUser, revenue_programs: [{}] } as any
    });
    tree();
    expect(screen.queryByTestId('mock-donation-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it("doesn't show the Core upgrade prompt if session state says that it has been closed", () => {
    window.sessionStorage.setItem(DONATIONS_CORE_UPGRADE_CLOSED, 'true');
    tree();
    expect(screen.queryByTestId('mock-donation-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it("doesn't show the Core upgrade prompt while pages are loading", () => {
    useContributionPageListMock.mockReturnValue({
      createPage: jest.fn(),
      error: undefined,
      isError: false,
      isLoading: true,
      newPageProperties: jest.fn(),
      userCanCreatePage: jest.fn(),
      userCanPublishPage: jest.fn()
    });
    tree();
    expect(screen.queryByTestId('mock-donation-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it("doesn't show the Core upgrade prompt if pages failed to load", () => {
    useContributionPageListMock.mockReturnValue({
      createPage: jest.fn(),
      error: new Error(),
      isError: true,
      isLoading: false,
      newPageProperties: jest.fn(),
      userCanCreatePage: jest.fn(),
      userCanPublishPage: jest.fn()
    });
    tree();
    expect(screen.queryByTestId('mock-donation-core-upgrade-prompt')).not.toBeInTheDocument();
  });

  it("doesn't show the Core upgrade prompt if the user doesn't have any published pages", () => {
    useContributionPageListMock.mockReturnValue({
      createPage: jest.fn(),
      pages: [
        {
          published_date: undefined
        }
      ] as any,
      error: undefined,
      isError: false,
      isLoading: false,
      newPageProperties: jest.fn(),
      userCanCreatePage: jest.fn(),
      userCanPublishPage: jest.fn()
    });
    tree();
    expect(screen.queryByTestId('mock-donation-core-upgrade-prompt')).not.toBeInTheDocument();
  });
});
