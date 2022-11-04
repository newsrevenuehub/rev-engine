import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import * as reactQuery from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import MockAdapter from 'axios-mock-adapter';
import { ReactChild } from 'react';

import axios from 'ajax/axios';
import { LIST_STYLES } from 'ajax/endpoints';
import useStyleList from './useStyleList';
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

describe('useStyleList hook', () => {
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

  const stylesList = [
    { id: 1, styles: { foo: 'bar' } },
    { id: 2, styles: { bizz: 'bang' } }
  ];

  beforeEach(() => {
    jest.resetModules();
    axiosMock.onGet(LIST_STYLES).reply(200, [...stylesList]);
  });

  afterEach(() => {
    axiosMock.reset();
  });

  it('returns a `refetch` function that invalidates the styles query', () => {
    const mockInvalidateQueries = jest.fn();
    const spy = jest.spyOn(reactQuery, 'useQueryClient');
    // cast this to `as any` so we don't have to provide all 33 params that are in returned
    // queryClient in real implementation
    spy.mockReturnValue({ invalidateQueries: mockInvalidateQueries } as any);
    const {
      result: {
        current: { refetch }
      }
    } = renderHook(() => useStyleList(), { wrapper });
    expect(typeof refetch).toBe('function');
    refetch();
    expect(mockInvalidateQueries).toHaveBeenCalledWith(['styles']);
  });

  it('returns the styles furnished by the styles API endpoint', async () => {
    const { waitForValueToChange, result } = renderHook(() => useStyleList(), { wrapper });
    await waitForValueToChange(() => result.current.styles);
    expect(result.current.styles).toEqual(stylesList);
  });

  it('console.errors and alerts when there is a network error', async () => {
    axiosMock.reset();
    axiosMock.onGet(LIST_STYLES).networkError();
    const { waitForValueToChange, result } = renderHook(() => useStyleList(), { wrapper });
    await waitForValueToChange(() => result.current.isError);
    expect(mockAlertError).toHaveBeenCalledTimes(1);
    expect(mockAlertError).toHaveBeenCalledWith(GENERIC_ERROR);
  });
  it('redirects user to log in when auth error', async () => {
    axiosMock.reset();
    axiosMock.onGet(LIST_STYLES).reply(function (config) {
      return Promise.reject({ name: 'AuthenticationError' });
    });
    const { waitForValueToChange, result } = renderHook(() => useStyleList(), { wrapper });
    await waitForValueToChange(() => result.current.isError);
    expect(mockHistoryPush).toHaveBeenCalledTimes(1);
    expect(mockHistoryPush).toHaveBeenCalledWith(SIGN_IN);
  });
});
