import needsProfileFinalization from './needsProfileFinalization';

describe('needsProfileFinalization', () => {
  describe('when the user has a null role', () => {
    it('returns true if the user has no organizations', () =>
      expect(
        needsProfileFinalization({
          role_type: null,
          organizations: []
        })
      ).toBe(true));

    it('returns false if the user has one organization', () =>
      expect(
        needsProfileFinalization({
          role_type: null,
          organizations: [{}]
        })
      ).toBe(false));
  });

  describe('when the user is an org admin', () => {
    it('returns false if the user has no organizations', () =>
      expect(
        needsProfileFinalization({
          role_type: ['org_admin', 'Org Admin'],
          organizations: []
        })
      ).toBe(false));

    it('returns false if the user has one organization', () =>
      expect(
        needsProfileFinalization({
          role_type: ['org_admin', 'Org Admin'],
          organizations: [
            {
              id: 1,
              name: 'Some Org',
              slug: 'some-org',
              stripe_account_id: 'some-id',
              stripe_verified: true,
              default_payment_provider: 'stripe'
            }
          ]
        })
      ).toBe(false));
  });

  describe('when the user is a Hub admin', () => {
    it('returns false', () =>
      expect(
        needsProfileFinalization({
          role_type: ['hub_admin', 'Hub Admin'],
          organizations: []
        })
      ).toBe(false));
  });
});
