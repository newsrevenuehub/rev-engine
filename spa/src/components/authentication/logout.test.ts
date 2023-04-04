import Axios from 'ajax/axios';
import { LS_CSRF_TOKEN, LS_SIDEBAR_CORE_UPGRADE_CLOSED, LS_USER } from 'appSettings';
import MockAdapter from 'axios-mock-adapter';
import { waitFor } from 'test-utils';
import logout from './logout';

describe('logout', () => {
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    axiosMock.onDelete().reply(200);
  });

  it('makes a DELETE request to /token', async () => {
    logout();
    await waitFor(() => expect(axiosMock.history.delete).toHaveLength(1));
    expect(axiosMock.history.delete).toEqual([expect.objectContaining({ url: 'token/' })]);
  });

  it('logs an error if the DELETE fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    axiosMock.onDelete().networkError();
    await logout();
    expect(errorSpy).toBeCalledTimes(1);
  });

  it('removes the LS_USER key from local storage', async () => {
    window.localStorage.setItem(LS_USER, 'test');
    expect(window.localStorage.getItem(LS_USER)).not.toBeNull();
    await logout();
    expect(window.localStorage.getItem(LS_USER)).toBeNull();
  });

  it('removes the LS_CSRF_TOKEN key from local storage', async () => {
    window.localStorage.setItem(LS_CSRF_TOKEN, 'test');
    expect(window.localStorage.getItem(LS_CSRF_TOKEN)).not.toBeNull();
    await logout();
    expect(window.localStorage.getItem(LS_CSRF_TOKEN)).toBeNull();
  });

  it('removes the LS_SIDEBAR_CORE_UPGRADE_CLOSED key from local storage', async () => {
    window.localStorage.setItem(LS_SIDEBAR_CORE_UPGRADE_CLOSED, 'test');
    expect(window.localStorage.getItem(LS_SIDEBAR_CORE_UPGRADE_CLOSED)).not.toBeNull();
    await logout();
    expect(window.localStorage.getItem(LS_SIDEBAR_CORE_UPGRADE_CLOSED)).toBeNull();
  });

  it('redirects the user to the root of the domain', async () => {
    delete (global as any).window.location;
    global.window = Object.create(window);
    (global as any).window.location = { href: '/somewhere-else' };
    await logout();
    expect(window.location.href).toBe('/');
  });
});
