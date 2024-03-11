import { LS_CONTRIBUTOR, LS_USER, SS_CONTRIBUTOR } from 'appSettings';
import isAuthenticated from './isAuthenticated';

describe('isAuthenticated', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  describe.each(['CONTRIBUTOR', 'PORTAL'])('when asked for a contributor type %s', (type: any) => {
    const [storageKey, storageType, storage] =
      type === 'CONTRIBUTOR'
        ? [LS_CONTRIBUTOR, 'local', window.localStorage]
        : [SS_CONTRIBUTOR, 'session', window.sessionStorage];

    it(`returns false if there isn't the appropriate ${storageType} storage key`, () => {
      expect(isAuthenticated(type)).toBe(false);
    });

    it(`returns true if there is the appropriate ${storageType} storage key`, () => {
      storage.setItem(storageKey, '');
      expect(isAuthenticated(type)).toBe(true);
    });
  });

  describe('when not asked for a contributor', () => {
    it("returns false if there isn't the appropriate local storage key", () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('returns true if there is the appropriate local storage key', () => {
      window.localStorage.setItem(LS_USER, '');
      expect(isAuthenticated()).toBe(true);
    });
  });
});
