import { EnginePlan } from 'hooks/useContributionPage';

/**
 * Human-readable names of plans.
 */
export const PLAN_NAMES: Record<EnginePlan['name'], string> = {
  CORE: 'Core',
  FREE: 'Free',
  PLUS: 'Plus'
};

/**
 * A record of valid plan labels. The values are the same as the keys so you can
 * write `PLAN_LABELS.FREE` and it will resolve to `'FREE'`.
 */
export const PLAN_LABELS = Object.keys(PLAN_NAMES).reduce((result, key) => ({ ...result, [key]: key }), {}) as Record<
  EnginePlan['name'],
  EnginePlan['name']
>;
