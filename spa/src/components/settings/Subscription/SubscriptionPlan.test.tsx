import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { PLAN_ANNUAL_COSTS, PLAN_LABELS, PLAN_NAMES } from 'constants/orgPlanConstants';
import SubscriptionPlan, { SubscriptionPlanProps } from './SubscriptionPlan';

function tree(props?: Partial<SubscriptionPlanProps>) {
  return render(<SubscriptionPlan plan={PLAN_LABELS.FREE} {...props} />);
}

describe('SubscriptionPlan', () => {
  describe.each([[PLAN_LABELS.FREE], [PLAN_LABELS.CORE]])('When given the %s plan', (plan) => {
    it('displays the correct plan label', () => {
      tree({ plan });
      expect(screen.getByText(`${PLAN_NAMES[plan]} Tier`)).toBeVisible();
    });

    it('displays the correct annual cost', () => {
      tree({ plan });
      expect(screen.getByText(`$${PLAN_ANNUAL_COSTS[plan]}`)).toBeVisible();
      expect(screen.getByText('/year')).toBeVisible();
    });

    it('is accessible', async () => {
      const { container } = tree({ plan: PLAN_LABELS.FREE });

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When given the PLUS plan', () => {
    it('displays the correct plan label', () => {
      tree({ plan: PLAN_LABELS.PLUS });
      expect(screen.getByText(`${PLAN_NAMES.PLUS} Tier`)).toBeVisible();
    });

    it("doesn't display an annual cost", () => {
      tree({ plan: PLAN_LABELS.PLUS });
      expect(screen.queryByText('$')).not.toBeInTheDocument();
      expect(screen.queryByText('/year')).not.toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = tree({ plan: PLAN_LABELS.FREE });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
