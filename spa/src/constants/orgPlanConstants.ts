import { EnginePlan } from 'hooks/useContributionPage';

/**
 * Annual cost of each plan in USD. These are *only* for display purposes. These
 * are not used for actual billing. Undefined here means that we don't have a
 * cost to display.
 */
export const PLAN_ANNUAL_COSTS: Record<EnginePlan['name'], number | undefined> = {
  CORE: 2000,
  FREE: 0,
  PLUS: undefined
};

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
