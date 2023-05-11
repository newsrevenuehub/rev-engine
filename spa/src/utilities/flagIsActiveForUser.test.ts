import flagIsActiveForUser from './flagIsActiveForUser';

describe('flagIsActiveForUser', () => {
  it('returns true if the flag is in the array of flags passed', () =>
    expect(flagIsActiveForUser('test', [{ name: 'other' }, { name: 'test' }])).toBe(true));

  it('returns false if the flag is not in the array of flags passed', () =>
    expect(flagIsActiveForUser('test', [{ name: 'other' }])).toBe(false));

  it('returns false if passed an empty array of flags', () => expect(flagIsActiveForUser('test', [])).toBe(false));
});
