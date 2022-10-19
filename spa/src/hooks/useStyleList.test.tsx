import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import * as reactQuery from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import MockAdapter from 'axios-mock-adapter';
import { ReactChild } from 'react';

import axios from 'ajax/axios';
import { SIGN_IN } from 'routes';
import { LIST_STYLES } from 'ajax/endpoints';
import useStyleList from "./useStyleList";

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: mockHistoryPush
  }),
}));


jest.mock('react-alert', () => ({
  ...jest.requireActual('react-alert'),
  useAlert: () => ({ error: jest.fn() })
}));


// jest.mock('@tanstack/react-query', () => ({
//   ...jest.requireActual('@tanstack/react-query'),
//   useQuery: jest.fn()
// }))


const axiosMock = new MockAdapter(axios);


describe('useStyleList hook', () => {

  const wrapper = ({ children }: { children: ReactChild }) => (
    <QueryClientProvider client={new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })}>{children}</QueryClientProvider>
  );

  const stylesList = [
    { id: 1, styles: { foo: 'bar' } },
    { id: 2, styles: { bizz: 'bang' } },
  ];

  beforeEach(() => {
    jest.resetModules();
    axiosMock.onGet(LIST_STYLES).reply(
      function (config) {
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            resolve([200, [...stylesList]]);
          }, 100);
        });
      });
  });

  afterEach(() => {
    axiosMock.reset();
  });

  it.each`
    queryLoadingState
    ${false}
    ${true}
    `('hook returns `isLoading: $queryLoadingState` when query isLoading is $queryLoadingState', async ({ queryLoadingState }) => {
    const mockUseQuery = useQuery as jest.Mock;
    mockUseQuery.mockReturnValue({ isLoading: queryLoadingState });
    const { result, } = renderHook(() => useStyleList(), { wrapper });
    expect(result.current.isLoading).toBe(queryLoadingState);
  });

  it.each`
    queryErrorState,
    ${false}
    ${true}
    `('hook returns `isError: $queryErrorState` when query isError is $queryErrorState', async ({ queryErrorState }) => {
    const mockUseQuery = useQuery as jest.Mock;
    mockUseQuery.mockReturnValue({ isError: queryErrorState });
    const { result } = renderHook(() => useStyleList(), { wrapper });
    expect(result.current.isLoading).toBe(queryErrorState);
  });

  it('returns a `refetch` function that invalidates the styles query', () => {
    reactQuery.useQuery = { ...jest.requireActual('@tanstack/react-query') };
    const mockInvalidateQueries = jest.fn();
    jest.spyOn(reactQuery, 'useQueryClient').mockImplementation(() => {
      return {
        invalidateQueries: mockInvalidateQueries
      };
    });
    const { result: { current: { refetch } } } = renderHook(() => useStyleList(), { wrapper });
    expect(typeof refetch).toBe('function');
    refetch();
    expect(mockInvalidateQueries).toHaveBeenCalledWith(['styles'])
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

  });

  it.only('redirects user to log in when auth error', async () => {
    axiosMock.reset();
    axiosMock.onGet(LIST_STYLES).reply((function (config) {
      return Promise.reject({name: 'AuthenticationError'});
    }));
    const { waitForValueToChange, result } = renderHook(() => useStyleList(), { wrapper });
    await waitForValueToChange(() => result.current.isError);
    expect(mockHistoryPush).toHaveBeenCalledTimes(1);
    expect(mockHistoryPush).toHaveBeenCalledWith(SIGN_IN)
  });
});
