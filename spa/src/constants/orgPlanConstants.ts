import { EnginePlan } from 'hooks/useContributionPage';

/**
 * Human-readable names of plans.
 */
export const PLAN_LABELS: Record<EnginePlan['name'], string> = {
  CORE: 'Core',
  FREE: 'Free',
  PLUS: 'Plus'
};

/**
 * A record of valid plan labels. The values are the same as the keys so you can
 * write `PLAN_NAMES.FREE` and it will resolve to `'FREE'`.
 */
export const PLAN_NAMES = Object.keys(PLAN_LABELS).reduce((result, key) => ({ ...result, [key]: key }), {}) as Record<
  EnginePlan['name'],
  EnginePlan['name']
>;
