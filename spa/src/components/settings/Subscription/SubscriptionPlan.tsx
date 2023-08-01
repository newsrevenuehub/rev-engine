import { PLAN_ANNUAL_COSTS, PLAN_LABELS } from 'constants/orgPlanConstants';
import PropTypes, { InferProps } from 'prop-types';
import { PlanCost, PlanCostInterval, PlanName, Root } from './SubscriptionPlan.styled';
import { EnginePlan } from 'hooks/useContributionPage';

const SubscriptionPlanPropTypes = {
  className: PropTypes.string,
  plan: PropTypes.oneOf(Object.keys(PLAN_LABELS)).isRequired
};

export type SubscriptionPlanProps = InferProps<typeof SubscriptionPlanPropTypes>;

export function SubscriptionPlan({ className, plan }: SubscriptionPlanProps) {
  return (
    <Root className={className!}>
      <PlanName $plan={plan as EnginePlan['name']}>{PLAN_LABELS[plan as EnginePlan['name']]} Tier</PlanName>
      {PLAN_ANNUAL_COSTS[plan as keyof typeof PLAN_ANNUAL_COSTS] !== undefined && (
        <PlanCost>
          ${PLAN_ANNUAL_COSTS[plan as keyof typeof PLAN_ANNUAL_COSTS]}
          <PlanCostInterval>/year</PlanCostInterval>
        </PlanCost>
      )}
    </Root>
  );
}

SubscriptionPlan.propTypes = SubscriptionPlanPropTypes;
export default SubscriptionPlan;
