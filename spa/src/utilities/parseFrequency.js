export function getFrequencyAdjective(frequency) {
  switch (frequency) {
    case 'one_time':
      return 'One time';
    case 'month':
      return 'Monthly';
    case 'year':
      return 'Yearly';

    default:
      return '';
  }
}

export function getFrequencyAdverb(frequency) {
  switch (frequency) {
    case 'one_time':
      return 'once';
    case 'month':
      return 'monthly';
    case 'year':
      return 'yearly';

    default:
      return '';
  }
}

export function getFrequencyRate(frequency) {
  switch (frequency) {
    case 'one_time':
      return '';
    case 'month':
      return '/month';
    case 'year':
      return '/year';

    default:
      return '';
  }
}

export function getFrequencyThankYouText(frequency) {
  switch (frequency) {
    case 'one_time':
      return 'one-time';
    case 'month':
      return 'monthly';
    case 'year':
      return 'yearly';

    default:
      return '';
  }
}
