import * as Sentry from '@sentry/react';
import { renderHook } from '@testing-library/react-hooks';
import { useHistory } from 'react-router-dom';
import { LS_USER } from 'appSettings';
import Axios from 'ajax/axios';
import MockAdapter from 'axios-mock-adapter';
import { useAlert } from 'react-alert';
import { User } from './useUser.types';
import { TestQueryClientProvider } from 'test-utils';
import useUser from './useUser';

jest.mock('@sentry/react');
jest.mock('react-alert');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn()
}));

const mockUser: User = {
  firstName: 'mock-first-name',
  lastName: 'mock-last-name',
  email: 'mock-email',
  email_verified: true,
  flags: [],
  id: 'mock-id',
  organizations: [],
  revenue_programs: [],
  role_type: ['org_admin', 'Org Admin']
};

describe('useUser', () => {
  const axiosMock = new MockAdapter(Axios);
  const useAlertMock = jest.mocked(useAlert);
  const useHistoryMock = jest.mocked(useHistory);
  const SentryMock = jest.mocked(Sentry);

  beforeEach(() => {
    window.localStorage.clear();
    axiosMock.onGet('users/').reply(200, mockUser);
    useAlertMock.mockReturnValue({ error: jest.fn(), success: jest.fn() } as any);
    useHistoryMock.mockReturnValue({ push: jest.fn() });
  });
  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  it('fetches the current user from the users/ endpoint', async () => {
    const { waitFor } = renderHook(() => useUser(), { wrapper: TestQueryClientProvider });

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(axiosMock.history.get).toEqual([expect.objectContaining({ url: 'users/' })]);
  });

  describe('When fetching the user succeeds', () => {
    it('returns the user data to consumers', async () => {
      const { result, waitFor } = renderHook(() => useUser(), { wrapper: TestQueryClientProvider });

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(result.current.user).toEqual(mockUser);
    });

    it('sets the user in Sentry', async () => {
      const setUserMock = jest.fn();

      SentryMock.setUser = setUserMock;

      const { waitFor } = renderHook(() => useUser(), { wrapper: TestQueryClientProvider });

      expect(setUserMock).not.toBeCalled();
      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(setUserMock.mock.calls).toEqual([[{ email: mockUser.email, id: mockUser.id, ip_address: '{{auto}}' }]]);
    });

    it('sets the user in local storage', async () => {
      const { waitFor } = renderHook(() => useUser(), { wrapper: TestQueryClientProvider });

      expect(window.localStorage.getItem(LS_USER)).toBeNull();
      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(window.localStorage.getItem(LS_USER)).toBe(JSON.stringify(mockUser));
    });
  });

  describe('When fetching the user fails', () => {
    // Silence noisy errors to make test output easier to read.

    let errorSpy: jest.SpyInstance;
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
      errorSpy = jest.spyOn(console, 'error').mockReturnValue();
      logSpy = jest.spyOn(console, 'log').mockReturnValue();
      axiosMock.reset();
    });

    afterEach(() => {
      errorSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('returns the error state to consumers', async () => {
      axiosMock.onGet('users/').networkError();

      const { result, waitFor } = renderHook(() => useUser(), { wrapper: TestQueryClientProvider });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isError).toBe(true);
    });

    it('clears the user in Sentry', async () => {
      const setUserMock = jest.fn();

      SentryMock.setUser = setUserMock;
      axiosMock.onGet('users/').networkError();

      const { result, waitFor } = renderHook(() => useUser(), { wrapper: TestQueryClientProvider });

      expect(setUserMock).not.toBeCalled();
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(setUserMock.mock.calls).toEqual([[null]]);
    });

    it('goes to the signin page if the error was an authentication one', async () => {
      const push = jest.fn();

      useHistoryMock.mockReset();
      useHistoryMock.mockReturnValue({ push });
      axiosMock.onGet('users/').reply(401);

      const { result, waitFor } = renderHook(() => useUser(), { wrapper: TestQueryClientProvider });

      expect(push).not.toBeCalled();
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(push.mock.calls).toEqual([['/sign-in/']]);
    });

    it('shows an error alert if the error was not authentication-related', async () => {
      const error = jest.fn();

      useAlertMock.mockReturnValue({ error, success: jest.fn() } as any);
      axiosMock.onGet('users/').networkError();

      const { result, waitFor } = renderHook(() => useUser(), { wrapper: TestQueryClientProvider });

      expect(error).not.toBeCalled();
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(error).toBeCalledTimes(1);
    });
  });
});
