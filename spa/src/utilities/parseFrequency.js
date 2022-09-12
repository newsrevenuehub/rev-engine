import { CONTRIBUTION_INTERVALS } from 'constants';

export function getFrequencyAdjective(frequency) {
  switch (frequency) {
    case CONTRIBUTION_INTERVALS.ONE_TIME:
      return 'One time';
    case CONTRIBUTION_INTERVALS.MONTHLY:
      return 'Monthly';
    case CONTRIBUTION_INTERVALS.ANNUAL:
      return 'Yearly';

    default:
      return '';
  }
}

export function getFrequencyAdverb(frequency) {
  switch (frequency) {
    case CONTRIBUTION_INTERVALS.ONE_TIME:
      return 'once';
    case CONTRIBUTION_INTERVALS.MONTHLY:
      return 'monthly';
    case CONTRIBUTION_INTERVALS.ANNUAL:
      return 'yearly';

    default:
      return '';
  }
}

export function getFrequencyRate(frequency) {
  switch (frequency) {
    case CONTRIBUTION_INTERVALS.ONE_TIME:
      return '';
    case CONTRIBUTION_INTERVALS.MONTHLY:
      return '/month';
    case CONTRIBUTION_INTERVALS.ANNUAL:
      return '/year';

    default:
      return '';
  }
}

export function getFrequencyThankYouText(frequency) {
  switch (frequency) {
    case CONTRIBUTION_INTERVALS.ONE_TIME:
      return 'one-time';
    case CONTRIBUTION_INTERVALS.MONTHLY:
      return 'monthly';
    case CONTRIBUTION_INTERVALS.ANNUAL:
      return 'yearly';

    default:
      return '';
  }
}
