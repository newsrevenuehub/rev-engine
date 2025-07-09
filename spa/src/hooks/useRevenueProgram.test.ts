import { useQueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import Axios from 'ajax/axios';
import MockAdapter from 'axios-mock-adapter';
import { TestQueryClientProvider } from 'test-utils';
import { RevenueProgram, useRevenueProgram } from './useRevenueProgram';

const mockRevenueProgram: RevenueProgram = {
  id: 123,
  contact_email: '',
  contact_phone: '',
  default_donation_page: null,
  fiscal_sponsor_name: null,
  fiscal_status: 'fiscally sponsored',
  name: 'mock-rp-name',
  organization: 456,
  payment_provider_stripe_verified: true,
  slug: 'mock-rp-slug',
  tax_id: 'mock-tax-id',
  transactional_email_style: {} as any
};

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn()
}));

function hook(id?: number) {
  return renderHook(() => useRevenueProgram(id), {
    wrapper: TestQueryClientProvider
  });
}

describe('useRevenueProgram', () => {
  const useQueryClientMock = jest.mocked(useQueryClient);
  const axiosMock = new MockAdapter(Axios);
  let invalidateQueries: jest.Mock;

  beforeEach(() => {
    invalidateQueries = jest.fn();
    useQueryClientMock.mockReturnValue({ invalidateQueries } as any);
    axiosMock.onGet(`/revenue-programs/${mockRevenueProgram.id}/`).reply(200, mockRevenueProgram);
    axiosMock.onPatch(`/revenue-programs/${mockRevenueProgram.id}/`).reply(200);
  });

  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  describe('When no revenue program ID is passed', () => {
    it("doesn't try to fetch data", async () => {
      hook();
      await Promise.resolve();
      expect(axiosMock.history.get).toHaveLength(0);
    });

    it('returns empty state', () => {
      const { result } = hook();

      expect(result.current).toEqual({ isFetching: false });
    });
  });

  it('returns a fetching state while fetching data', async () => {
    const { result, waitForNextUpdate } = hook(mockRevenueProgram.id);

    expect(result.current).toEqual({ isFetching: true, updateRevenueProgram: expect.any(Function) });
    await waitForNextUpdate();
  });

  it('returns the revenue program data after it has been fetched', async () => {
    const { result, waitForNextUpdate } = hook(mockRevenueProgram.id);

    await waitForNextUpdate();
    expect(result.current).toEqual({
      isFetching: false,
      revenueProgram: mockRevenueProgram,
      updateRevenueProgram: expect.any(Function)
    });
  });

  describe('updateRevenueProgram', () => {
    it('calls the correct endpoint', async () => {
      const { result } = hook(mockRevenueProgram.id);

      expect(axiosMock.history.patch.length).toBe(0);
      await result.current.updateRevenueProgram!({});
      expect(axiosMock.history.patch.length).toBe(1);
      expect(axiosMock.history.patch[0].url).toBe(`revenue-programs/${mockRevenueProgram.id}/`);
    });

    it('sends the body to the endpoint', async () => {
      const { result } = hook(mockRevenueProgram.id);

      await result.current.updateRevenueProgram!({ contact_email: 'mock@mail.com' });
      expect(axiosMock.history.patch[0].data).toBe('{"contact_email":"mock@mail.com"}');
    });

    it('invalidates the user and revenue program queries if the patch succeeds', async () => {
      const { waitFor, result } = hook(mockRevenueProgram.id);

      expect(invalidateQueries).not.toHaveBeenCalled();
      await result.current.updateRevenueProgram!({});
      await waitFor(() => expect(axiosMock.history.patch.length).toBe(1));
      expect(invalidateQueries.mock.calls).toHaveLength(2);
      expect(invalidateQueries).toBeCalledWith(['user']);
      expect(invalidateQueries).toBeCalledWith(['revenueProgram', mockRevenueProgram.id]);
    });

    it("throws an error and doesn't invalidate any queries if the patch fails", async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      axiosMock.reset();
      axiosMock.onGet(`/revenue-programs/${mockRevenueProgram.id}/`).reply(200, mockRevenueProgram);
      axiosMock.onPatch(`/revenue-programs/${mockRevenueProgram.id}/`).networkError();

      const { result } = hook(mockRevenueProgram.id);

      expect(invalidateQueries).not.toHaveBeenCalled();
      await expect(() => result.current.updateRevenueProgram!({})).rejects.toThrow(
        expect.objectContaining({ message: 'Network Error' })
      );
      errorSpy.mockRestore();
    });
  });
});
