import * as reactQuery from '@tanstack/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook } from '@testing-library/react-hooks';
import axios from 'ajax/axios';
import { LIST_STYLES } from 'ajax/endpoints';
import MockAdapter from 'axios-mock-adapter';
import { GENERIC_ERROR } from 'constants/textConstants';
import { useSnackbar } from 'notistack';
import { ReactChild } from 'react';
import { SIGN_IN } from 'routes';
import { waitFor } from 'test-utils';
import useStyleList, { Style } from './useStyleList';

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: mockHistoryPush
  })
}));
jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: jest.fn()
}));

const mockAlertError = jest.fn();
jest.mock('react-alert', () => ({
  ...jest.requireActual('react-alert'),
  useAlert: () => ({ error: mockAlertError })
}));

const axiosMock = new MockAdapter(axios);

describe('useStyleList hook', () => {
  const useSnackbarMock = useSnackbar as jest.Mock;
  const enqueueSnackbar = jest.fn();
  let errorSpy: jest.SpyInstance;

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

  const stylesList = [{ id: 1, name: 'mock-style-name-1' } as Style, { id: 2, name: 'mock-style-name-2' } as Style];

  beforeEach(() => {
    jest.resetModules();
    useSnackbarMock.mockReturnValue({ enqueueSnackbar });
    axiosMock.onGet(LIST_STYLES).reply(200, stylesList);
  });

  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

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

    // Prevents an update on unmounted component warning.
    cleanup();
  });

  it('returns the styles furnished by the styles API endpoint', async () => {
    const { waitForValueToChange, result } = renderHook(() => useStyleList(), { wrapper });
    await waitForValueToChange(() => result.current.styles);
    expect(result.current.styles).toEqual(stylesList);
  });

  it('console.errors and alerts when there is a network error', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    axiosMock.reset();
    axiosMock.onGet(LIST_STYLES).networkError();
    const { waitForValueToChange, result } = renderHook(() => useStyleList(), { wrapper });
    await waitForValueToChange(() => result.current.isError);
    expect(mockAlertError).toHaveBeenCalledTimes(1);
    expect(mockAlertError).toHaveBeenCalledWith(GENERIC_ERROR);
    errorSpy.mockRestore();
  });

  it('redirects user to log in when auth error', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    axiosMock.reset();
    axiosMock.onGet(LIST_STYLES).reply(() => Promise.reject({ name: 'AuthenticationError' }));
    const { waitForValueToChange, result } = renderHook(() => useStyleList(), { wrapper });
    await waitForValueToChange(() => result.current.isError);
    expect(mockHistoryPush).toHaveBeenCalledTimes(1);
    expect(mockHistoryPush).toHaveBeenCalledWith(SIGN_IN);
    errorSpy.mockRestore();
  });

  it('should create a new style', async () => {
    axiosMock
      .onPost('styles/')
      .reply(200, { name: 'mock-page-name', revenue_program: 'mock-rev-prog', style_prop: 'mock-prop' });

    const { result } = renderHook(() => useStyleList(), { wrapper });

    expect(axiosMock.history.post.length).toBe(0);

    await result.current.createStyle({ fontSizes: ['size-1', 'size-2'] }, {
      name: 'mock-page-name',
      revenue_program: { id: 'mock-rev-prog' }
    } as any);

    expect(axiosMock.history.post.length).toBe(1);
    expect(axiosMock.history.post[0].url).toBe('styles/');
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      name: 'mock-page-name',
      revenue_program: 'mock-rev-prog',
      fontSizes: ['size-1', 'size-2']
    });
  });

  it('should update an existing style', async () => {
    axiosMock.onPatch(`styles/${stylesList[0].id}/`).reply(200);

    const { result } = renderHook(() => useStyleList(), { wrapper });

    expect(axiosMock.history.patch.length).toBe(0);

    await result.current.updateStyle({ id: stylesList[0].id, fontSizes: ['size-1', 'size-2'] });

    expect(axiosMock.history.patch.length).toBe(1);
    expect(axiosMock.history.patch[0].url).toBe(`styles/${stylesList[0].id}/`);
    expect(JSON.parse(axiosMock.history.patch[0].data)).toEqual({
      id: stylesList[0].id,
      fontSizes: ['size-1', 'size-2']
    });
  });

  it('should delete an existing style', async () => {
    axiosMock.onDelete(`styles/${stylesList[0].id}/`).reply(200);

    const { result } = renderHook(() => useStyleList(), { wrapper });

    expect(axiosMock.history.delete.length).toBe(0);

    await result.current.deleteStyle({ id: stylesList[0].id, fontSizes: ['size-1', 'size-2'] });

    expect(axiosMock.history.delete.length).toBe(1);
    expect(axiosMock.history.delete[0].url).toBe(`styles/${stylesList[0].id}/`);
    expect(axiosMock.history.delete[0].data).toEqual(undefined);
  });

  it.each([
    ['PATCH', { id: 'mock-patch-style-id' }],
    ['POST', { font: 'mock-font' }]
  ])('shows an error notification if the styles %s fails', async (method, mockStyles) => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    axiosMock.onPost(`styles/`).networkError();
    axiosMock.onPatch(`styles/mock-patch-style-id/`).networkError();
    axiosMock.onDelete(`styles/mock-patch-style-id/`).networkError();

    const { result } = renderHook(() => useStyleList(), { wrapper });

    expect(axiosMock.history.post.length).toBe(0);
    expect(axiosMock.history.patch.length).toBe(0);
    expect(axiosMock.history.delete.length).toBe(0);

    const selectedFunction = {
      POST: result.current.createStyle,
      PATCH: result.current.updateStyle
    }[method];
    const inputs: [any, any] =
      method === 'POST'
        ? [
            mockStyles,
            {
              name: 'mock-page-name',
              revenue_program: { id: 'mock-rev-prog' }
            }
          ]
        : [mockStyles, undefined];

    await expect(() => selectedFunction!(...inputs)).rejects.toThrowError();

    expect(axiosMock.history.post.length).toBe(method === 'POST' ? 1 : 0);
    expect(axiosMock.history.patch.length).toBe(method === 'PATCH' ? 1 : 0);
    expect(axiosMock.history.delete.length).toBe(0);

    await waitFor(() =>
      expect(enqueueSnackbar).toBeCalledWith(
        'Style changes were not saved. Please wait and try again or changes will be lost.',
        expect.objectContaining({
          persist: true
        })
      )
    );

    errorSpy.mockRestore();
  });

  it('shows an error alert if the styles DELETE fails', async () => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    axiosMock.onDelete(`styles/${stylesList[0].id}/`).networkError();

    const { result } = renderHook(() => useStyleList(), { wrapper });

    expect(axiosMock.history.delete.length).toBe(0);

    await expect(() => result.current.deleteStyle!(stylesList[0])).rejects.toThrowError();

    expect(axiosMock.history.delete.length).toBe(1);

    await waitFor(() => expect(mockAlertError).toHaveBeenCalledTimes(1));
    expect(mockAlertError).toHaveBeenCalledWith(GENERIC_ERROR);

    errorSpy.mockRestore();
  });
});
