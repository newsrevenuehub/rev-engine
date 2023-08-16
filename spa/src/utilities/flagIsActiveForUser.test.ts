import flagIsActiveForUser from './flagIsActiveForUser';

describe('flagIsActiveForUser', () => {
  it('returns true if the flag is in the array of flags passed', () =>
    expect(flagIsActiveForUser('test', { flags: [{ name: 'other' }, { name: 'test' }] } as any)).toBe(true));

  it('returns false if the flag is not in the array of flags passed', () =>
    expect(flagIsActiveForUser('test', { flags: [{ name: 'other' }] } as any)).toBe(false));

  it('returns false if passed an empty array of flags', () =>
    expect(flagIsActiveForUser('test', { flags: [] } as any)).toBe(false));
});
