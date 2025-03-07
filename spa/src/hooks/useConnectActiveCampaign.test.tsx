import { renderHook } from '@testing-library/react-hooks';
import Axios from 'ajax/axios';
import MockAdapter from 'axios-mock-adapter';
import { TestQueryClientProvider } from 'test-utils';
import useUser from './useUser';
import { User } from './useUser.types';
import { useConnectActiveCampaign } from './useConnectActiveCampaign';

jest.mock('./useUser');

const mockUser: User = {
  email: 'mock@email.com',
  email_verified: true,
  flags: [],
  id: 'mock-id',
  organizations: [
    {
      name: 'mock-org-name',
      plan: { name: 'CORE' } as any,
      slug: 'mock-org-slug'
    }
  ],
  revenue_programs: [{ id: 1, name: 'mock-rp-name', slug: 'mock-rp-slug' }],
  role_type: ['org_admin', 'Org Admin']
} as any;
const mockActiveCampaignStatusResponse = {
  activecampaign_integration_connected: true,
  activecampaign_server_url: 'mock-ac-server-url',
  id: 'mock-rp-id',
  name: 'mock-rp-name',
  slug: 'mock-rp-slug'
};

// URL is hardcoded so that if constant is mistakenly changed, the test
// will fail.

const activeCampaignStatusEndpoint = `/revenue-programs/${mockUser.revenue_programs[0].id}/activecampaign_configure/`;

function hook() {
  return renderHook(() => useConnectActiveCampaign(), { wrapper: TestQueryClientProvider });
}

describe('useConnectActiveCampaign', () => {
  const axiosMock = new MockAdapter(Axios);
  const useUserMock = jest.mocked(useUser);

  beforeEach(() => {
    axiosMock.onGet(activeCampaignStatusEndpoint).reply(200, mockActiveCampaignStatusResponse);
    useUserMock.mockReturnValue({ user: mockUser, isError: false, isLoading: false, refetch: jest.fn() });
  });
  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  it('makes no request if the user has no revenue programs', async () => {
    useUserMock.mockReturnValue({
      user: { ...mockUser, revenue_programs: [] },
      isError: false,
      isLoading: false,
      refetch: jest.fn()
    });
    hook();
    await Promise.resolve();
    expect(axiosMock.history.get.length).toBe(0);
  });

  it("requests the ActiveCampaign status of the user's first revenue program", async () => {
    const { waitFor } = hook();

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(axiosMock.history.get[0].url).toBe(activeCampaignStatusEndpoint);
  });

  it('returns a loading status while the request is loading', async () => {
    const { result } = hook();

    expect(result.current.isError).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('returns an error if the request fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockReturnValue();
    axiosMock.reset();
    axiosMock.onGet(activeCampaignStatusEndpoint).networkError();

    const { result, waitFor } = hook();

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(result.current.isError).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    errorSpy.mockRestore();
  });

  it('returns the response data if the request succeeds', async () => {
    const { result, waitFor } = hook();

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(result.current.isError).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(mockActiveCampaignStatusResponse);
  });
});
