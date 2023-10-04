import isPortalAppPath from './isPortalAppPath';

const realLocation = window.location;

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

  it.each(['/portal/', '/portal/verification/', '/portal/my-contributions'])(
    'should return true if path is: %s',
    (route) => {
      delete (window as any).location;
      window.location = {
        ...realLocation,
        pathname: route
      };
      expect(isPortalAppPath()).toBe(true);
    }
  );

  it.each(['/other/', '/dashboard/', '/login/'])('should return false if path it is any other string: %s', (route) => {
    delete (window as any).location;
    window.location = {
      ...realLocation,
      pathname: route
    };
    expect(isPortalAppPath()).toBe(false);
  });
});
