import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { PLAN_LABELS, PLAN_NAMES } from 'constants/orgPlanConstants';
import SubscriptionPlan, { SubscriptionPlanProps } from './SubscriptionPlan';

function tree(props?: Partial<SubscriptionPlanProps>) {
  return render(<SubscriptionPlan plan={PLAN_NAMES.FREE} {...props} />);
}

describe('SubscriptionPlan', () => {
  describe.each([[PLAN_NAMES.FREE], [PLAN_NAMES.CORE], [PLAN_NAMES.PLUS]])('When given the %s plan', (plan) => {
    it('displays the correct plan label', () => {
      tree({ plan });
      expect(screen.getByText(`${PLAN_LABELS[plan]} Tier`)).toBeVisible();
    });

    it('is accessible', async () => {
      const { container } = tree({ plan: PLAN_NAMES.FREE });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
