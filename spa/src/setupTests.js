import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import { server } from 'test-server';
import { Cookies } from 'react-cookie';

expect.extend(toHaveNoViolations);

beforeAll(() => {
  // establish API mocking
  server.listen();
});

afterEach(() => {
  // reset any request handlers that are declared as a part of our tests
  server.resetHandlers();
  // we remove all cookies in between tests because otherwise their value
  // can stick around and cause unexpected behavior in subsequent tests.
  Object.keys(Cookies).forEach((cookie) => Cookies.remove(cookie));
});

afterAll(() => {
  server.close();
});
