import { ContributionInterval, CONTRIBUTION_INTERVAL_SORT_ORDER } from 'constants/contributionIntervals';
import { ContributionPage, FrequencyElement } from 'hooks/useContributionPage';

export type ContributionIntervalList = {
  interval: ContributionInterval;
}[];

export function getPageContributionIntervals(page: ContributionPage): ContributionIntervalList {
  const frequencies = page.elements?.filter(({ type }) => type === 'DFrequency') as FrequencyElement[];

  if (frequencies.length === 0) {
    return [];
  }

  if (frequencies.length > 1) {
    throw new Error(`Page contains ${frequencies.length} DFrequency elements`);
  }

  return CONTRIBUTION_INTERVAL_SORT_ORDER.reduce<ContributionIntervalList>((result, current) => {
    const element = frequencies[0].content.find(({ value }) => value === current);

    if (element) {
      return [...result, { interval: element.value }];
    }

    return result;
  }, []);
}

export default getPageContributionIntervals;
