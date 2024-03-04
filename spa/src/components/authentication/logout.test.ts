import Axios from 'ajax/axios';
import { LS_USER } from 'appSettings';
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

  it('clears session storage', async () => {
    window.sessionStorage.setItem('test', 'true');
    expect(window.sessionStorage.getItem('test')).not.toBeNull();
    await logout();
    expect(window.sessionStorage.getItem('test')).toBeNull();
  });

  it('redirects the user to the root of the domain', async () => {
    const assignSpy = jest.spyOn(window.location, 'assign');

    await logout();
    expect(assignSpy.mock.calls).toEqual([['/']]);
  });
});
