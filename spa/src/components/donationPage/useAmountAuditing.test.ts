import * as Sentry from '@sentry/react';
import { useAmountAuditing } from './useAmountAuditing';
import { renderHook } from '@testing-library/react-hooks';

jest.mock('@sentry/react');

function hook() {
  return renderHook(() => useAmountAuditing());
}

describe('useAmountAuditing', () => {
  const sentryMock = jest.mocked(Sentry);

  describe('auditPaymentCreation', () => {
    let captureExceptionMock: jest.Mock;

    beforeEach(() => {
      captureExceptionMock = jest.fn();

      sentryMock.captureException = captureExceptionMock;
    });

    it.each([[1], [1.33], [1.99]])('logs a Sentry exception if the amount is %i', (amount) => {
      const { result } = hook();

      expect(captureExceptionMock).not.toBeCalled();
      result.current.auditPaymentCreation(amount);
      expect(captureExceptionMock.mock.calls).toEqual([[expect.any(Error)]]);
    });

    it("doesn't log a Sentry exception if the amount is $2.00", () => {
      const { result } = hook();

      expect(captureExceptionMock).not.toBeCalled();
      result.current.auditPaymentCreation(2);
      expect(captureExceptionMock).not.toBeCalled();
    });
  });

  it('logs a Sentry breadcrumb when auditAmountCreation is called', () => {
    const addBreadcrumbMock = jest.fn();

    sentryMock.addBreadcrumb = addBreadcrumbMock;

    const { result } = hook();

    expect(addBreadcrumbMock).not.toBeCalled();
    result.current.auditAmountChange(123.45);
    expect(addBreadcrumbMock.mock.calls).toEqual([
      [
        {
          category: 'rev-engine',
          level: 'debug',
          message: 'Contribution amount changed to 123.45'
        }
      ]
    ]);
  });

  it('logs a Sentry breadcrumb when auditFrequencyChange is called', () => {
    const addBreadcrumbMock = jest.fn();

    sentryMock.addBreadcrumb = addBreadcrumbMock;

    const { result } = hook();

    expect(addBreadcrumbMock).not.toBeCalled();
    result.current.auditFrequencyChange('monthly');
    expect(addBreadcrumbMock.mock.calls).toEqual([
      [
        {
          category: 'rev-engine',
          level: 'debug',
          message: 'Contribution frequency changed to monthly'
        }
      ]
    ]);
  });

  it('logs a Sentry breadcrumb when auditPayFeesChange is called', () => {
    const addBreadcrumbMock = jest.fn();

    sentryMock.addBreadcrumb = addBreadcrumbMock;

    const { result } = hook();

    expect(addBreadcrumbMock).not.toBeCalled();
    result.current.auditPayFeesChange(true);
    expect(addBreadcrumbMock.mock.calls).toEqual([
      [
        {
          category: 'rev-engine',
          level: 'debug',
          message: 'Pays fees changed to true'
        }
      ]
    ]);
  });
});
