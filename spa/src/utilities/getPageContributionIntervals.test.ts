import getPageContributionIntervals from './getPageContributionIntervals';

describe('getPageContributionIntervals', () => {
  it('returns an empty array if the page contains no DFrequency elements', () =>
    expect(
      getPageContributionIntervals({
        elements: []
      } as any)
    ).toEqual([]));

  it('throws an error if the page contains more than one DFrequency element', () =>
    expect(() =>
      getPageContributionIntervals({
        elements: [{ type: 'DFrequency' }, { type: 'DFrequency' }]
      } as any)
    ).toThrow());

  it('returns a sorted array of frequencies based on the DFrequency element', () =>
    expect(
      getPageContributionIntervals({
        elements: [
          {
            type: 'DFrequency',
            content: [
              { value: 'year', isDefault: false },
              { value: 'month', isDefault: true },
              { value: 'one_time', isDefault: false }
            ]
          }
        ]
      } as any)
    ).toEqual([{ interval: 'one_time' }, { interval: 'month' }, { interval: 'year' }]));

  it('ignores content in sidebar_elements', () =>
    expect(
      getPageContributionIntervals({
        elements: [
          {
            type: 'DFrequency',
            content: [
              { value: 'month', isDefault: true },
              { value: 'one_time', isDefault: false }
            ]
          }
        ],
        sidebar_elements: [
          {
            type: 'DFrequency',
            content: [{ value: 'year', isDefault: false }]
          }
        ]
      } as any)
    ).toEqual([{ interval: 'one_time' }, { interval: 'month' }]));
});
