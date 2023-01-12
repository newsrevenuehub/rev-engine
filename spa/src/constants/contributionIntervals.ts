export type ContributionInterval = 'one_time' | 'month' | 'year';

export const CONTRIBUTION_INTERVALS: { [x: string]: ContributionInterval } = {
  ONE_TIME: 'one_time',
  MONTHLY: 'month',
  ANNUAL: 'year'
};
