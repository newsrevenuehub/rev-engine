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
              { value: 'year', isDefault: false, displayName: 'Yearly' },
              { value: 'month', isDefault: true, displayName: 'Monthly' },
              { value: 'one_time', isDefault: false, displayName: 'One-time' }
            ]
          }
        ]
      } as any)
    ).toEqual([
      { displayName: 'One-time', interval: 'one_time' },
      { displayName: 'Monthly', interval: 'month' },
      { displayName: 'Yearly', interval: 'year' }
    ]));

  it('ignores content in sidebar_elements', () =>
    expect(
      getPageContributionIntervals({
        elements: [
          {
            type: 'DFrequency',
            content: [
              { value: 'month', isDefault: true, displayName: 'Monthly' },
              { value: 'one_time', isDefault: false, displayName: 'One-time' }
            ]
          }
        ],
        sidebar_elements: [
          {
            type: 'DFrequency',
            content: [{ value: 'year', isDefault: false, displayName: 'Yearly' }]
          }
        ]
      } as any)
    ).toEqual([
      { displayName: 'One-time', interval: 'one_time' },
      { displayName: 'Monthly', interval: 'month' }
    ]));
});
