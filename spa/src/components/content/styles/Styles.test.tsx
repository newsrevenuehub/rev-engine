import { render, screen } from 'test-utils';

import { USER_ROLE_ORG_ADMIN_TYPE } from 'constants/authConstants';
import { PLAN_LABELS } from 'constants/orgPlanConstants';
import { useSessionState } from 'hooks/useSessionState';
import useUser from 'hooks/useUser';
import Styles, { PAID_SUBTITLE } from './Styles';

jest.mock('hooks/useUser');
jest.mock('hooks/useSessionState');
jest.mock('elements/GlobalLoading');
jest.mock('components/common/Hero/Hero');
jest.mock('components/common/SendTestEmail/SendTestEmail');
jest.mock('./CustomizeCoreUpgradePrompt/CustomizeCoreUpgradePrompt');

const orgPlan = (plan: string) => ({
  plan: {
    name: plan
  }
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
    return render(<Styles />);
  }

  beforeEach(() => {
    useSessionStateMock.mockReturnValue([false, setSessionState]);
  });

  it('should render loading is user is loading', () => {
    useUserMock.mockImplementation(() => ({ isLoading: true } as any));
    tree();
    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
  });

  describe.each([PLAN_LABELS.FREE, PLAN_LABELS.CORE, PLAN_LABELS.PLUS])('org plan: %s', (plan) => {
    beforeEach(() => {
      useUserMock.mockImplementation(
        () => ({ user: { ...orgAdminUser, organizations: [orgPlan(plan)] }, isLoading: false } as any)
      );
    });

    it('should render Hero component with correct subtitle', () => {
      const subtitle = plan === PLAN_LABELS.FREE ? '' : PAID_SUBTITLE;
      tree();
      const hero = screen.getByTestId('mock-hero');
      expect(hero).toBeVisible();
      expect(hero.dataset.subtitle).toBe(subtitle);
    });

    it('should render SendTestEmail with correct rpId', () => {
      tree();
      expect(screen.getByTestId('mock-send-test-email').dataset.rpid).toBe('mock-id');
    });

    if (plan === PLAN_LABELS.FREE) {
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
        expect(screen.getByTestId('mock-customize-core-upgrade-prompt')).toBeVisible();
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
