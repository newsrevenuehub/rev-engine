import { LS_CONTRIBUTOR, LS_USER } from 'appSettings';
import isAuthenticated from './isAuthenticated';

describe('isAuthenticated', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  describe('when asked for a contributor', () => {
    it("returns false if there isn't the appropriate local storage key", () => {
      expect(isAuthenticated(true)).toBe(false);
    });

    it('returns true if there is the appropriate local storage key', () => {
      window.localStorage.setItem(LS_CONTRIBUTOR, '');
      expect(isAuthenticated(true)).toBe(true);
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
