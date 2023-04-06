import { EnginePlan } from 'hooks/useContributionPage';
import PropTypes, { InferProps } from 'prop-types';
import { Root } from './EnginePlanBadge.styled';

const EnginePlanBadgePropTypes = {
  className: PropTypes.string,
  plan: PropTypes.string.isRequired
};

export interface EnginePlanBadgeProps extends InferProps<typeof EnginePlanBadgePropTypes> {
  plan: EnginePlan['name'];
}

export function EnginePlanBadge({ className, plan }: EnginePlanBadgeProps) {
  return (
    <Root className={className!} $plan={plan}>
      {plan}
    </Root>
  );
}

EnginePlanBadge.propTypes = EnginePlanBadgePropTypes;
export default EnginePlanBadge;
