import { useQueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import Axios from 'ajax/portal-axios';
import MockAdapter from 'axios-mock-adapter';
import { TestQueryClientProvider } from 'test-utils';
import { useRevenueProgram } from './useRevenueProgram';

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn()
}));

function hook(error = false) {
  return renderHook(() => useRevenueProgram(error ? undefined : 123), {
    wrapper: TestQueryClientProvider
  });
}

describe('useRevenueProgram', () => {
  const useQueryClientMock = jest.mocked(useQueryClient);
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    useQueryClientMock.mockReturnValue({ invalidateQueries: jest.fn() } as any);
    axiosMock.onPatch('/revenue-programs/123/').reply(200);
  });

  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  describe('PATCH /revenue-programs/:id/', () => {
    it('does not call the endpoint if "updateRevenueProgram" not called', () => {
      hook();
      expect(axiosMock.history.patch.length).toBe(0);
    });

    it('calls the correct endpoint', async () => {
      const { result } = hook();

      await result.current.updateRevenueProgram({});
      expect(axiosMock.history.patch.length).toBe(1);
      expect(axiosMock.history.patch[0].url).toBe('revenue-programs/123/');
    });

    it('passes the body to the endpoint', async () => {
      const { result } = hook();

      await result.current.updateRevenueProgram({ contact_email: 'mock@mail.com' });

      expect(axiosMock.history.patch[0].data).toBe('{"contact_email":"mock@mail.com"}');
    });

    it('invalidates the user query on success', async () => {
      const invalidateQueries = jest.fn();
      useQueryClientMock.mockReturnValue({ invalidateQueries } as any);
      const { waitFor, result } = hook();

      expect(invalidateQueries).not.toHaveBeenCalled();

      await result.current.updateRevenueProgram({});

      await waitFor(() => expect(axiosMock.history.patch.length).toBe(1));

      expect(invalidateQueries).toHaveBeenCalledWith(['user']);
      expect(invalidateQueries).toHaveBeenCalledTimes(1);
    });

    describe('Errors', () => {
      beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
      });
      afterAll(() => {
        jest.restoreAllMocks();
      });

      it("doesn't invalidate the user query on error", async () => {
        axiosMock.onPatch('/revenue-programs/123/').networkError();
        const invalidateQueries = jest.fn();
        useQueryClientMock.mockReturnValue({ invalidateQueries } as any);
        const { result } = hook();

        expect(invalidateQueries).not.toHaveBeenCalled();

        try {
          await result.current.updateRevenueProgram({});
        } catch (err) {}

        expect(invalidateQueries).not.toHaveBeenCalled();
      });

      it('throws an error on endpoint failure', async () => {
        axiosMock.onPatch('/revenue-programs/123/').networkError();
        const { result } = hook();

        await expect(() => result.current.updateRevenueProgram({})).rejects.toThrow(
          expect.objectContaining({ message: 'Network Error' })
        );
      });

      it('returns a dumb function if revenue_program is undefined', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation();

        const { result } = hook(true);

        await result.current.updateRevenueProgram({});

        expect(axiosMock.history.patch.length).toBe(0);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith('No revenue program ID provided');
        warn.mockRestore();
      });
    });
  });
});
