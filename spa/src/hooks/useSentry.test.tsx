import * as Sentry from '@sentry/react';
import { renderHook } from '@testing-library/react-hooks';
import { ComponentType } from 'react';
import { render, screen, within } from 'test-utils';
import useSentry, { SentryRoute } from './useSentry';

// We need this to be immediate to mock the HOC call.

jest.mock('@sentry/react', () => ({
  ...jest.requireActual('@sentry/react'),
  init: jest.fn(),
  withSentryRouting: (Component: ComponentType) => () => (
    <div data-testid="with-sentry-routing">
      <Component />
    </div>
  )
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Route: () => <div data-testid="react-router-route" />
}));

// Create a getter for SENTRY_ENABLE_FRONTEND so we can change its value in
// tests. See https://jestjs.io/docs/jest-object#jestspyonobject-methodname-accesstype
// and https://stackoverflow.com/a/64262146

const mockSentryEnableFrontEndGetter = jest.fn();

jest.mock('appSettings', () => ({
  ENVIRONMENT: 'mock-env',
  SENTRY_DSN_FRONTEND: 'mock-sentry-dsn-frontend',
  get SENTRY_ENABLE_FRONTEND() {
    return mockSentryEnableFrontEndGetter();
  }
}));

describe('useSentry', () => {
  const initMock = Sentry.init as jest.Mock;
  let oldEnv: string | undefined;

  beforeEach(() => (oldEnv = import.meta.env.NODE_ENV));
  afterEach(() => (import.meta.env.NODE_ENV = oldEnv));

  it('initializes Sentry in a non-development environment and when SENTRY_ENABLE_FRONTEND is true', () => {
    import.meta.env.NODE_ENV = 'production';
    mockSentryEnableFrontEndGetter.mockReturnValue(true);
    renderHook(() => useSentry());
    expect(initMock.mock.calls).toEqual([
      [
        {
          dsn: 'mock-sentry-dsn-frontend',
          environment: 'mock-env',
          integrations: expect.any(Array),
          tracesSampleRate: 0.3
        }
      ]
    ]);
  });

  it("doesn't initialize Sentry in a development environment", () => {
    import.meta.env.NODE_ENV = 'development';
    mockSentryEnableFrontEndGetter.mockReturnValue(true);
    renderHook(() => useSentry());
    expect(initMock).not.toBeCalled();
  });

  it("doesn't initialize Sentry if SENTRY_ENABLE_FRONTEND is false", () => {
    import.meta.env.NODE_ENV = 'production';
    mockSentryEnableFrontEndGetter.mockReturnValue(false);
    renderHook(() => useSentry());
    expect(initMock).not.toBeCalled();
  });
});

describe('SentryRoute', () => {
  it('decorates a React Router Route component with withSentryRouting', () => {
    render(<SentryRoute />);
    expect(within(screen.getByTestId('with-sentry-routing')).getByTestId('react-router-route')).toBeInTheDocument();
  });
});
