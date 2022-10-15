import { getAmountIndex, getDefaultAmountForFreq } from './amountUtils';

const mockElement = {
  type: 'DAmount',
  content: {
    defaults: {
      mockFrequency: 200
    },
    options: {
      mockFrequency: [100, 200, 300]
    }
  }
};

const mockStringElement = {
  type: 'DAmount',
  content: {
    defaults: {
      mockFrequency: '200'
    },
    options: {
      mockFrequency: ['100', '200', '300']
    }
  }
};

describe('getAmountIndex', () => {
  it('returns the index of the amount in a frequency list', () =>
    expect(getAmountIndex({ elements: [mockElement] }, 200, 'mockFrequency')).toBe(1));

  it('coerces string values to numbers', () => {
    expect(getAmountIndex({ elements: [mockStringElement] }, 200, 'mockFrequency')).toBe(1);
    expect(getAmountIndex({ elements: [mockStringElement] }, '200', 'mockFrequency')).toBe(1);
    expect(getAmountIndex({ elements: [mockElement] }, '200', 'mockFrequency')).toBe(1);
  });

  it('returns -1 if there is no matching amount', () =>
    expect(getAmountIndex({ elements: [mockStringElement] }, 0, 'mockFrequency')).toBe(-1));

  it('returns -1 if there is no matching frequency', () =>
    expect(getAmountIndex({ elements: [mockStringElement] }, 100, 'nonexistent')).toBe(-1));

  it('returns -1 if there are no DAmount elements in the page', () =>
    expect(getAmountIndex({ elements: [] }, 100, 'mockFrequency')).toBe(-1));

  it('returns -1 if the page object is malformed', () => expect(getAmountIndex({}, 100, 'mockFrequency')).toBe(-1));
});

describe('getDefaultAmountForFreq', () => {
  it('returns the default amount for a given frequency', () =>
    expect(getDefaultAmountForFreq('mockFrequency', { elements: [mockElement] })).toBe(200));

  it('coerces string values to numbers', () =>
    expect(getDefaultAmountForFreq('mockFrequency', { elements: [mockStringElement] })).toBe(200));

  it('returns the first amount if no default is set', () =>
    expect(
      getDefaultAmountForFreq('mockFrequency', {
        elements: [{ ...mockElement, content: { ...mockElement.content, defaults: { otherFrequency: 200 } } }]
      })
    ).toBe(100));

  it('returns undefined if no amounts are available for the frequency requested', () =>
    expect(
      getDefaultAmountForFreq('nonexistent', {
        elements: [mockElement]
      })
    ).toBeUndefined());

  it('returns undefined if there are no DAmount elements in the page', () =>
    expect(getDefaultAmountForFreq('mockFrequency', { elements: [] })).toBeUndefined());

  it('returns undefined if the page object is malformed', () =>
    expect(getDefaultAmountForFreq('mockFrequency', {})).toBeUndefined());
});
