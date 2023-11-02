import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import { Cookies } from 'react-cookie';

expect.extend(toHaveNoViolations);

const mocki18n = { t: (key, options) => `${key}${options ? JSON.stringify(options) : ''}` };

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({
    i18n: mocki18n,
    t: mocki18n.t
  }),
  Trans: ({ children, i18nKey, components, values, ...rest }) => {
    const componentsFinal = Array.isArray(components) ? components : Object.values(components || {});

    return (
      <span
        data-testid={i18nKey}
        data-values={values && JSON.stringify(values)}
        data-rest={rest && JSON.stringify(rest)}
      >
        {componentsFinal && componentsFinal.map((component, index) => <span key={index}>{component}</span>)}
        {children}
      </span>
    );
  }
}));

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
