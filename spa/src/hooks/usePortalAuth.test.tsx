import * as Sentry from '@sentry/react';
import MockAdapter from 'axios-mock-adapter';
import { useState } from 'react';
import Axios from 'ajax/axios';
import { SS_CONTRIBUTOR } from 'appSettings';
import { fireEvent, render, screen, waitFor } from 'test-utils';
import { PortalAuthContextProvider, usePortalAuthContext } from './usePortalAuth';

jest.mock('@sentry/react');

function TestConsumer() {
  const { contributor, verifyToken } = usePortalAuthContext();
  const [error, setError] = useState<Error>();

  async function handleClick() {
    try {
      await verifyToken!('mock-email', 'mock-token');
    } catch (err) {
      setError(err as Error);
    }
  }

  return (
    <>
      {error && <div data-testid="error">{error.message}</div>}
      {contributor && <div data-testid="contributor">{JSON.stringify(contributor)}</div>}
      {verifyToken && <button onClick={handleClick}>verifyToken</button>}
    </>
  );
}

function tree() {
  render(
    <PortalAuthContextProvider>
      <TestConsumer />
    </PortalAuthContextProvider>
  );
}

const testContributor = {
  created: 'test-created',
  email: 'test-email',
  id: 123,
  modified: 'test-modified',
  uuid: 'test-uuid'
};

describe('PortalAuthContextProvider', () => {
  const axiosMock = new MockAdapter(Axios);
  const SentryMock = jest.mocked(Sentry);
  let setUserMock: jest.Mock;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    setUserMock = jest.fn();
    SentryMock.setUser = setUserMock;
  });

  afterAll(() => axiosMock.restore());

  it("initially sets the contributor object to undefined if it's not in session storage", () => {
    tree();
    expect(screen.queryByTestId('contributor')).not.toBeInTheDocument();
  });

  it('loads the contributor object from session storage if available', () => {
    window.sessionStorage.setItem(SS_CONTRIBUTOR, JSON.stringify(testContributor));
    tree();
    expect(screen.getByTestId('contributor')).toHaveTextContent(JSON.stringify(testContributor));
  });

  it('sets the user in Sentry if the contributor was set in session storage', () => {
    window.sessionStorage.setItem(SS_CONTRIBUTOR, JSON.stringify(testContributor));
    tree();
    expect(setUserMock.mock.calls).toEqual([
      [{ email: testContributor.email, id: testContributor.id, ip_address: '{{auto}}' }]
    ]);
  });

  it("doesn't provide a verifyToken function if a contributor was loaded from session storage", () => {
    window.sessionStorage.setItem(SS_CONTRIBUTOR, JSON.stringify(testContributor));
    tree();
    expect(screen.queryByText('verifyToken')).not.toBeInTheDocument();
  });

  it('ignores a malformed object in session storage', () => {
    window.sessionStorage.setItem(SS_CONTRIBUTOR, JSON.stringify({ ...testContributor, email: undefined }));
    tree();
    expect(screen.queryByTestId('contributor')).not.toBeInTheDocument();
    expect(setUserMock).not.toBeCalled();
  });

  describe('The verifyToken function it provides', () => {
    beforeEach(() => {
      axiosMock.onPost('contrib-verify/').reply(200, {
        contributor: testContributor,
        detail: 'success'
      });
    });

    afterEach(() => {
      axiosMock.reset();
    });

    it('POSTS email and token to contrib-verify/', async () => {
      tree();
      fireEvent.click(screen.getByText('verifyToken'));
      await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
      expect(axiosMock.history.post[0].url).toBe('contrib-verify/');
      expect(axiosMock.history.post[0].data).toEqual(JSON.stringify({ email: 'mock-email', token: 'mock-token' }));
    });

    describe('If the POST succeeds', () => {
      it('sets the contributor object in context', async () => {
        tree();
        expect(screen.queryByTestId('contributor')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('verifyToken'));
        await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
        expect(screen.getByTestId('contributor')).toHaveTextContent(JSON.stringify(testContributor));
      });

      it('identifies the user in Sentry', async () => {
        tree();
        expect(setUserMock).not.toBeCalled();
        fireEvent.click(screen.getByText('verifyToken'));
        await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
        expect(setUserMock.mock.calls).toEqual([
          [{ email: testContributor.email, id: testContributor.id, ip_address: '{{auto}}' }]
        ]);
      });

      it('no longer provides a verifyToken function in context', async () => {
        tree();
        fireEvent.click(screen.getByText('verifyToken'));
        await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
        expect(screen.queryByText('verifyToken')).not.toBeInTheDocument();
      });

      it('saves the contributor to session storage', async () => {
        tree();
        expect(window.sessionStorage.getItem(SS_CONTRIBUTOR)).toBe(null);
        fireEvent.click(screen.getByText('verifyToken'));
        await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
        expect(window.sessionStorage.getItem(SS_CONTRIBUTOR)).toBe(JSON.stringify(testContributor));
      });
    });

    it("throws an error and doesn't set the user in Sentry if the POST itself fails", async () => {
      axiosMock.reset();
      axiosMock.onPost().networkError();
      tree();
      expect(screen.queryByTestId('error')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('verifyToken'));
      await screen.findByTestId('error');
      expect(screen.getByTestId('error')).toHaveTextContent('Network Error');
    });

    it("throws an error  and doesn't set the user in Sentry if the response code isn't success", async () => {
      axiosMock.reset();
      axiosMock.onPost().reply(200, { detail: 'test-error' });
      tree();
      expect(screen.queryByTestId('error')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('verifyToken'));
      await screen.findByTestId('error');
      expect(screen.getByTestId('error')).toHaveTextContent('test-error');
      expect(setUserMock).not.toBeCalled();
    });

    it("throws an error and doesn't set the user in Sentry if contributor isn't present in the response", async () => {
      axiosMock.reset();
      axiosMock.onPost().reply(200, { detail: 'success' });
      tree();
      expect(screen.queryByTestId('error')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('verifyToken'));
      await screen.findByTestId('error');
      expect(screen.getByTestId('error')).toHaveTextContent('No contributor in token verification response');
      expect(setUserMock).not.toBeCalled();
    });
  });
});
