import showProfileScreen from './showProfileScreen';

const userHasNoOrgWithNoRole = {
  role_type: null,
  organizations: []
};

const userHasNoOrgWithRoleOrgAdmin = {
  role_type: ['org_admin', 'Org Admin'],
  organizations: []
};

describe('showProfileScreen Allowed', () => {
  test('returns true if user has single RP and has role null', async () => {
    expect(showProfileScreen(userHasNoOrgWithNoRole)).toBe(true);
  });
  test('returns false if user has role org_admin and no organizations', async () => {
    expect(showProfileScreen(userHasNoOrgWithRoleOrgAdmin)).toBe(false);
  });
});
