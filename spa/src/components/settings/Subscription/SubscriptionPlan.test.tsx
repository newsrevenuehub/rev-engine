import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { PLAN_LABELS, PLAN_NAMES } from 'constants/orgPlanConstants';
import SubscriptionPlan, { SubscriptionPlanProps } from './SubscriptionPlan';

function tree(props?: Partial<SubscriptionPlanProps>) {
  return render(<SubscriptionPlan plan={PLAN_LABELS.FREE} {...props} />);
}

describe('SubscriptionPlan', () => {
  describe.each([[PLAN_LABELS.FREE], [PLAN_LABELS.CORE], [PLAN_LABELS.PLUS]])('When given the %s plan', (plan) => {
    it('displays the correct plan label', () => {
      tree({ plan });
      expect(screen.getByText(`${PLAN_NAMES[plan]} Tier`)).toBeVisible();
    });

    it('is accessible', async () => {
      const { container } = tree({ plan: PLAN_LABELS.FREE });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
