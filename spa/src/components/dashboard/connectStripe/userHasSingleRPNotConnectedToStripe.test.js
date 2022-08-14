import userHasSingleRPNotConnectedToStripe from './userHasSingleRPNotConnectedToStripe';

const userHasSingleRPWithRoleOrgAdmin = {
  role_type: ['org_admin', 'Org Admin'],
  revenue_programs: [{ id: 1, slug: 'first' }]
};
const userHasManyRPs = {
  role_type: ['org_admin', 'Org Admin'],
  revenue_programs: [
    { id: 1, slug: 'first' },
    { id: 2, slug: 'second' }
  ]
};
const userHasNoRPs = { role_type: ['org_admin', 'Org Admin'], revenue_programs: [] };
const userisInvalid = null;
const userHasNoRPsDefined = {};
const userHasSingleRPWithRoleRPAdmin = {
  role_type: ['rp_admin', 'RP Admin'],
  revenue_programs: [{ id: 1, slug: 'first' }]
};

describe('ConnectStripeElements Allowed', () => {
  test('returns true if user has single RP and has role org_admin', async () => {
    expect(userHasSingleRPNotConnectedToStripe(userHasSingleRPWithRoleOrgAdmin)).toBe(true);
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
  test('returns false if user has single RP and has role rp_admin', async () => {
    expect(userHasSingleRPNotConnectedToStripe(userHasSingleRPWithRoleRPAdmin)).toBe(false);
  });
});
