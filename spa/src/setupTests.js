import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import { Cookies } from 'react-cookie';

expect.extend(toHaveNoViolations);

afterEach(() => {
  // we remove all cookies in between tests because otherwise their value
  // can stick around and cause unexpected behavior in subsequent tests.
  Object.keys(Cookies).forEach((cookie) => Cookies.remove(cookie));
});
