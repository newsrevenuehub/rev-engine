export type ContributionInterval = 'one_time' | 'month' | 'year';

export type ContributionIntervalKey = 'ONE_TIME' | 'MONTHLY' | 'ANNUAL';

export const CONTRIBUTION_INTERVALS: Record<ContributionIntervalKey, ContributionInterval> = {
  ONE_TIME: 'one_time',
  MONTHLY: 'month',
  ANNUAL: 'year'
};

export const CONTRIBUTION_INTERVAL_SORT_ORDER: ContributionInterval[] = ['one_time', 'month', 'year'];
