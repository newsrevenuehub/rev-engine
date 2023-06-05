import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import { Cookies } from 'react-cookie';

expect.extend(toHaveNoViolations);

afterEach(() => {
  // we remove all cookies in between tests because otherwise their value
  // can stick around and cause unexpected behavior in subsequent tests.
  Object.keys(Cookies).forEach((cookie) => Cookies.remove(cookie));
});

// Mock the global location object to make assign() able to be spied on.
// See https://www.benmvp.com/blog/mocking-window-location-methods-jest-jsdom/

const oldWindowLocation = window.location;

beforeAll(() => {
  delete window.location;

  window.location = Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(oldWindowLocation),
      assign: {
        configurable: true,
        value: jest.fn()
      }
    }
  );
});

afterAll(() => {
  window.location = oldWindowLocation;
});
