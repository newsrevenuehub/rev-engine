import isPortalAppPath from './isPortalAppPath';
import * as ROUTES from 'routes';

const realLocation = window.location;

const PORTAL_ROUTES = Object.values(ROUTES.PORTAL);
// Filter out the routes that are not part of the portal
const NON_PORTAL_ROUTES = Object.values(ROUTES)
  .flatMap((subroute) => (typeof subroute === 'string' ? subroute : Object.values(subroute)))
  .filter((route) => !PORTAL_ROUTES.includes(route as any));

describe('isPortalAppPath', () => {
  beforeEach(() => {
    delete (window as any).location;
    window.location = {
      ...realLocation,
      pathname: ''
    };
  });

  afterAll(() => {
    window.location = realLocation;
  });

  describe('should return true if path is:', () => {
    it.each([
      '/portal',
      '/portal/',
      '/portal/verification/',
      '/portal/my-contributions/',
      '/portal/my-contributions/abcd/',
      ...PORTAL_ROUTES
    ])('%s', (route) => {
      delete (window as any).location;
      window.location = {
        ...realLocation,
        pathname: route
      };
      expect(isPortalAppPath()).toBe(true);
    });
  });

  describe('should return false if path is:', () => {
    it.each(['/other/', '/dashboard/', '/login/', ...NON_PORTAL_ROUTES])('%s', (route) => {
      delete (window as any).location;
      window.location = {
        ...realLocation,
        pathname: route
      };
      expect(isPortalAppPath()).toBe(false);
    });
  });
});
