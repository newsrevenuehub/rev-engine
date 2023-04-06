import { PLAN_ANNUAL_COSTS, PLAN_NAMES } from 'constants/orgPlanConstants';
import PropTypes, { InferProps } from 'prop-types';
import { PlanCost, PlanCostInterval, PlanName, Root } from './SubscriptionPlan.styled';
import { EnginePlan } from 'hooks/useContributionPage';

const SubscriptionPlanPropTypes = {
  plan: PropTypes.oneOf(Object.keys(PLAN_NAMES)).isRequired
};

export type SubscriptionPlanProps = InferProps<typeof SubscriptionPlanPropTypes>;

export function SubscriptionPlan({ plan }: SubscriptionPlanProps) {
  return (
    <Root>
      <PlanName $plan={plan as EnginePlan['name']}>{PLAN_NAMES[plan as EnginePlan['name']]}</PlanName>
      {plan in PLAN_ANNUAL_COSTS && (
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
