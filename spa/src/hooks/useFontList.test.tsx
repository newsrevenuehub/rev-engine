import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as reactQuery from '@tanstack/react-query';
import { cleanup, renderHook } from '@testing-library/react-hooks';
import MockAdapter from 'axios-mock-adapter';
import { ReactChild } from 'react';

import axios from 'ajax/axios';
import useFontList from './useFontList';
import { SIGN_IN } from 'routes';
import { GENERIC_ERROR } from 'constants/textConstants';

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: mockHistoryPush
  })
}));

const mockAlertError = jest.fn();
jest.mock('react-alert', () => ({
  ...jest.requireActual('react-alert'),
  useAlert: () => ({ error: mockAlertError })
}));

const axiosMock = new MockAdapter(axios);

describe('useFontList hook', () => {
  const wrapper = ({ children }: { children: ReactChild }) => (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: {
              retry: false
            }
          }
        })
      }
    >
      {children}
    </QueryClientProvider>
  );

  const fontList = [
    { id: 1, name: 'mock-font-1', source: 'google' },
    { id: 2, name: 'mock-font-2', source: 'google' }
  ];

  beforeEach(() => {
    jest.resetModules();
    axiosMock.onGet('fonts/').reply(200, [...fontList]);
  });

  afterEach(() => {
    axiosMock.reset();
  });

  it('returns a `refetch` function that invalidates the fonts query', () => {
    const mockInvalidateQueries = jest.fn();
    const spy = jest.spyOn(reactQuery, 'useQueryClient');
    // cast this to `as any` so we don't have to provide all 33 params that are in returned
    // queryClient in real implementation
    spy.mockReturnValue({ invalidateQueries: mockInvalidateQueries } as any);
    const {
      result: {
        current: { refetch }
      }
    } = renderHook(() => useFontList(), { wrapper });
    expect(typeof refetch).toBe('function');
    refetch();
    expect(mockInvalidateQueries).toHaveBeenCalledWith(['fonts']);

    // Prevents an update on unmounted component warning.
    cleanup();
  });

  it('returns the fonts available in by RP in the fonts API endpoint', async () => {
    const { waitForValueToChange, result } = renderHook(() => useFontList(), { wrapper });
    await waitForValueToChange(() => result.current.fonts);
    expect(result.current.fonts).toEqual(fontList);
  });

  it('console.errors and alerts when there is a network error', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    axiosMock.reset();
    axiosMock.onGet('fonts/').networkError();
    const { waitForValueToChange, result } = renderHook(() => useFontList(), { wrapper });
    await waitForValueToChange(() => result.current.isError);
    expect(mockAlertError).toHaveBeenCalledTimes(1);
    expect(mockAlertError).toHaveBeenCalledWith(GENERIC_ERROR);
    errorSpy.mockRestore();
  });

  it('redirects user to log in when auth error', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    axiosMock.reset();
    axiosMock.onGet('fonts/').reply(() => Promise.reject({ name: 'AuthenticationError' }));
    const { waitForValueToChange, result } = renderHook(() => useFontList(), { wrapper });
    await waitForValueToChange(() => result.current.isError);
    expect(mockHistoryPush).toHaveBeenCalledTimes(1);
    expect(mockHistoryPush).toHaveBeenCalledWith(SIGN_IN);
    errorSpy.mockRestore();
  });
});
