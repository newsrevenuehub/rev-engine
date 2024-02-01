import MockAdapter from 'axios-mock-adapter';
import { useState } from 'react';
import Axios from 'ajax/axios';
import { LS_CONTRIBUTOR } from 'appSettings';
import { fireEvent, render, screen, waitFor } from 'test-utils';
import { PortalAuthContextProvider, usePortalAuthContext } from './usePortalAuth';

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

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterAll(() => axiosMock.restore());

  it("initially sets the contributor object to undefined if it's not in local storage", () => {
    tree();
    expect(screen.queryByTestId('contributor')).not.toBeInTheDocument();
  });

  it('loads the contributor object from local storage if available', () => {
    window.localStorage.setItem(LS_CONTRIBUTOR, JSON.stringify(testContributor));
    tree();
    expect(screen.getByTestId('contributor')).toHaveTextContent(JSON.stringify(testContributor));
  });

  it("doesn't provide a verifyToken function if a contributor was loaded from local storage", () => {
    window.localStorage.setItem(LS_CONTRIBUTOR, JSON.stringify(testContributor));
    tree();
    expect(screen.queryByText('verifyToken')).not.toBeInTheDocument();
  });

  it('ignores a malformed object in local storage', () => {
    window.localStorage.setItem(LS_CONTRIBUTOR, JSON.stringify({ ...testContributor, email: undefined }));
    tree();
    expect(screen.queryByTestId('contributor')).not.toBeInTheDocument();
  });

  describe('The verifyToken function it provides', () => {
    beforeEach(() => {
      axiosMock.onPost('contrib-verify/').reply(200, {
        contributor: testContributor,
        csrftoken: 'mock-csrf-token',
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

      it('no longer provides a verifyToken function in context', async () => {
        tree();
        fireEvent.click(screen.getByText('verifyToken'));
        await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
        expect(screen.queryByText('verifyToken')).not.toBeInTheDocument();
      });

      it('saves the contributor to local storage', async () => {
        tree();
        expect(window.localStorage.getItem(LS_CONTRIBUTOR)).toBe(null);
        fireEvent.click(screen.getByText('verifyToken'));
        await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
        expect(window.localStorage.getItem(LS_CONTRIBUTOR)).toBe(JSON.stringify(testContributor));
      });
    });

    it('throws an error if the POST itself fails', async () => {
      axiosMock.reset();
      axiosMock.onPost().networkError();
      tree();
      expect(screen.queryByTestId('error')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('verifyToken'));
      await screen.findByTestId('error');
      expect(screen.getByTestId('error')).toHaveTextContent('Network Error');
    });

    it("throws an error if the response code isn't success", async () => {
      axiosMock.reset();
      axiosMock.onPost().reply(200, { detail: 'test-error' });
      tree();
      expect(screen.queryByTestId('error')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('verifyToken'));
      await screen.findByTestId('error');
      expect(screen.getByTestId('error')).toHaveTextContent('test-error');
    });

    it("throws an error if contributor isn't present in the response", async () => {
      axiosMock.reset();
      axiosMock.onPost().reply(200, {
        csrftoken: 'mock-csrf-token',
        detail: 'success'
      });
      tree();
      expect(screen.queryByTestId('error')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('verifyToken'));
      await screen.findByTestId('error');
      expect(screen.getByTestId('error')).toHaveTextContent('No contributor in token verification response');
    });

    it("throws an error if a CSRF token isn't present in the response", async () => {
      axiosMock.reset();
      axiosMock.onPost().reply(200, {
        contributor: testContributor,
        detail: 'success'
      });
      tree();
      expect(screen.queryByTestId('error')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('verifyToken'));
      await screen.findByTestId('error');
      expect(screen.getByTestId('error')).toHaveTextContent('No CSRF in token verification response');
    });
  });
});
