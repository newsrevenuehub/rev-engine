import { render, screen } from 'test-utils';

import { USER_ROLE_ORG_ADMIN_TYPE } from 'constants/authConstants';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import { useSessionState } from 'hooks/useSessionState';
import useUser from 'hooks/useUser';
import Customize, { PAID_SUBTITLE } from './Customize';

jest.mock('hooks/useUser');
jest.mock('hooks/useSessionState');
jest.mock('components/common/GlobalLoading/GlobalLoading');
jest.mock('components/common/SendTestEmail/SendTestEmail');
jest.mock('./CustomizeCoreUpgradePrompt/CustomizeCoreUpgradePrompt');

const orgPlan = (plan: string) => ({
  plan: {
    name: plan
  },
  send_receipt_email_via_nre: true
});

const orgAdminUser = {
  role_type: [USER_ROLE_ORG_ADMIN_TYPE],
  organizations: [orgPlan('CORE')],
  revenue_programs: [{ id: 'mock-id', payment_provider_stripe_verified: true }]
};

describe('Customize Styles', () => {
  const useUserMock = jest.mocked(useUser);
  const useSessionStateMock = jest.mocked(useSessionState);
  const setSessionState = jest.fn();

  function tree() {
    return render(<Customize />);
  }

  beforeEach(() => {
    useSessionStateMock.mockReturnValue([false, setSessionState]);
  });

  it('should render loading is user is loading', () => {
    useUserMock.mockImplementation(() => ({ isLoading: true }) as any);
    tree();
    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
  });

  it('should render description for org without NRE email flag enabled', () => {
    useUserMock.mockImplementation(
      () =>
        ({
          isLoading: false,
          user: { ...orgAdminUser, organizations: [{ ...orgPlan('CORE'), send_receipt_email_via_nre: false }] }
        }) as any
    );
    tree();
    expect(
      screen.getByText('You’re not using RevEngine to send receipts. To start using RevEngine receipts, contact', {
        exact: false
      })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      'https://fundjournalism.org/news-revenue-engine-help/'
    );
    expect(screen.getByText('Send a test email to see our receipts!', { exact: false })).toBeInTheDocument();
  });

  describe.each([PLAN_NAMES.FREE, PLAN_NAMES.CORE, PLAN_NAMES.PLUS])('org plan: %s', (plan) => {
    const mockUser = { ...orgAdminUser, organizations: [orgPlan(plan)] };

    beforeEach(() => {
      useUserMock.mockReturnValue({ isLoading: false, user: mockUser } as any);
    });

    if (plan === PLAN_NAMES.FREE) {
      it('should show no subtitle', () => {
        tree();
        expect(screen.queryByTestId('subtitle')).not.toBeInTheDocument();
      });
    } else {
      it(`should show a "${PAID_SUBTITLE}" subtitle`, () => {
        tree();
        expect(screen.getByTestId('subtitle')).toHaveTextContent(PAID_SUBTITLE);
      });
    }

    it('should render SendTestEmail with correct rpId', () => {
      tree();
      expect(screen.getByTestId('mock-send-test-email').dataset.rpid).toBe('mock-id');
    });

    if (plan === PLAN_NAMES.FREE) {
      it('should not render Coming Soon section', () => {
        tree();
        expect(screen.queryByText('More features coming soon!')).not.toBeInTheDocument();
      });

      it('should render SendTestEmail with free description', () => {
        tree();
        expect(
          screen.getByText(
            'RevEngine will automatically send email receipts to your contributors. To use your logo and branding for email receipts,'
          )
        ).toBeVisible();
      });

      it('should render "upgrade to core" link', () => {
        tree();
        expect(screen.getByRole('link', { name: 'upgrade to Core!' })).toHaveAttribute(
          'href',
          'https://fundjournalism.org/i-want-revengine-core/'
        );
      });

      it('should render core upgrade prompt', () => {
        tree();

        const upgradePrompt = screen.getByTestId('mock-customize-core-upgrade-prompt');

        expect(upgradePrompt).toBeVisible();
      });

      it('should call onClose for upgrade prompt', () => {
        tree();
        expect(setSessionState).not.toHaveBeenCalled();
        screen.getByRole('button', { name: 'customize-on-close' }).click();
        expect(setSessionState).toHaveBeenCalledTimes(1);
        expect(setSessionState).toHaveBeenCalledWith(true);
      });
    } else {
      it('should render Coming Soon section', () => {
        tree();
        expect(screen.getByText('More features coming soon!')).toBeInTheDocument();
      });

      it('should not render core upgrade prompt', () => {
        tree();
        expect(screen.queryByTestId('mock-customize-core-upgrade-prompt')).not.toBeInTheDocument();
      });

      it('should render SendTestEmail with paid description', () => {
        tree();
        expect(
          screen.getByText(
            'We’ll use your brand elements and default contribution page to style receipts, payment reminders, and contributor portal emails. For marketing and engagement emails, check out',
            { exact: false }
          )
        ).toBeVisible();
      });

      it('should render "email automation integrations" link', () => {
        tree();
        expect(screen.getByRole('link', { name: 'email automation integrations.' })).toHaveAttribute(
          'href',
          '/settings/integrations'
        );
      });
    }
  });
});
