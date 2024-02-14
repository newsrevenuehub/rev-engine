import { renderHook } from '@testing-library/react-hooks';
import Axios from 'ajax/portal-axios';
import MockAdapter from 'axios-mock-adapter';
import { TestQueryClientProvider } from 'test-utils';

const mockPortalAxios = () => {
  const get = async () => {
    return await Axios.get('/mock');
  };

  return { get };
};

function hook() {
  return renderHook(() => mockPortalAxios(), {
    wrapper: TestQueryClientProvider
  });
}

describe('portal-axios', () => {
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    axiosMock.onGet('/mock').reply(200);
  });

  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  it('does not redirect if axios succeeds', async () => {
    const assign = jest.fn();
    jest.spyOn(window.location, 'assign').mockImplementation(assign);

    const { waitFor, result } = hook();

    result.current.get();

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(assign).not.toHaveBeenCalled();
  });

  it('does not redirect if axios error is not Authentication Error (not 401)', async () => {
    const assign = jest.fn();
    jest.spyOn(window.location, 'assign').mockImplementation(assign);

    axiosMock.onGet('/mock').networkError();

    const { waitFor, result } = hook();

    try {
      await result.current.get();
    } catch {}

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(assign).not.toHaveBeenCalled();
  });

  it('redirects user to magic link (login) page if axios error is Authentication Error (401)', async () => {
    const assign = jest.fn();
    jest.spyOn(window.location, 'assign').mockImplementation(assign);

    axiosMock.onGet('/mock').reply(401);

    expect(assign).not.toHaveBeenCalled();

    const { waitFor, result } = hook();

    try {
      await result.current.get();
    } catch {}

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(assign).toHaveBeenCalledWith('/portal/');
  });
});
