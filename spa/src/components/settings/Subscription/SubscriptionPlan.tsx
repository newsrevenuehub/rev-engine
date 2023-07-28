import { PLAN_NAMES } from 'constants/orgPlanConstants';
import PropTypes, { InferProps } from 'prop-types';
import { PlanName, Root } from './SubscriptionPlan.styled';
import { EnginePlan } from 'hooks/useContributionPage';

const SubscriptionPlanPropTypes = {
  className: PropTypes.string,
  plan: PropTypes.oneOf(Object.keys(PLAN_NAMES)).isRequired
};

export type SubscriptionPlanProps = InferProps<typeof SubscriptionPlanPropTypes>;

export function SubscriptionPlan({ className, plan }: SubscriptionPlanProps) {
  return (
    <Root className={className!}>
      <PlanName $plan={plan as EnginePlan['name']}>{PLAN_NAMES[plan as EnginePlan['name']]} Tier</PlanName>
    </Root>
  );
}

SubscriptionPlan.propTypes = SubscriptionPlanPropTypes;
export default SubscriptionPlan;
