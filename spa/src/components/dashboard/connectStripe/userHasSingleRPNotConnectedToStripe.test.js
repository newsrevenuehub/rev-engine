import userHasSingleRPNotConnectedToStripe from './userHasSingleRPNotConnectedToStripe';

const userHasSingleRP = { revenue_programs: [{ id: 1, slug: 'first' }] };
const userHasManyRPs = {
  revenue_programs: [
    { id: 1, slug: 'first' },
    { id: 2, slug: 'second' }
  ]
};
const userHasNoRPs = { revenue_programs: [] };
const userisInvalid = null;
const userHasNoRPsDefined = {};

describe('Page Title component', () => {
  test('returns true if user has single RP', async () => {
    expect(userHasSingleRPNotConnectedToStripe(userHasSingleRP)).toBe(true);
  });
  test('returns false if user has many RPs', async () => {
    expect(userHasSingleRPNotConnectedToStripe(userHasManyRPs)).toBe(false);
  });
  test('returns false if user has no RPs', async () => {
    expect(userHasSingleRPNotConnectedToStripe(userHasNoRPs)).toBe(false);
  });
  test('returns false if user is null', async () => {
    expect(userHasSingleRPNotConnectedToStripe(userisInvalid)).toBe(false);
  });
  test('returns false if user does not RPs defined', async () => {
    expect(userHasSingleRPNotConnectedToStripe(userHasNoRPsDefined)).toBe(false);
  });
});
