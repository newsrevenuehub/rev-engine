// Avoiding our own test-utils so we can create a custom render context without
// the normal BrowserRouter.
import { render, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { createMemoryHistory, InitialEntry } from 'history';
import { useAlert } from 'react-alert';
import { Route, Router } from 'react-router-dom';
import Axios from 'ajax/axios';
import { MAILCHIMP_OAUTH_SUCCESS } from 'ajax/endpoints';
import { GENERIC_ERROR } from 'constants/textConstants';
import useConnectMailchimp from 'hooks/useConnectMailchimp';
import { RevenueProgram } from 'hooks/useRevenueProgram';
import { MAILCHIMP_OAUTH_SUCCESS_ROUTE, SETTINGS } from 'routes';
import { TestQueryClientProvider } from 'test-utils';
import MailchimpOAuthSuccess from './MailchimpOAuthSuccess';

jest.mock('components/common/GlobalLoading/GlobalLoading');
jest.mock('hooks/useConnectMailchimp');
jest.mock('react-alert');

const mockUseConnectMailchimpResult = {
  connectedToMailchimp: false,
  hasMailchimpAccess: false,
  isError: false,
  isLoading: false,
  requiresAudienceSelection: false,
  justConnectedToMailchimp: false,
  revenueProgram: { id: 'mock-rp-id' } as unknown as RevenueProgram,
  setRefetchInterval: jest.fn()
};

function tree(initialEntries: InitialEntry[] = [`/${MAILCHIMP_OAUTH_SUCCESS_ROUTE}?code=mock-mailchimp-code`]) {
  const history = createMemoryHistory({ initialEntries });

  return {
    history,
    ...render(
      <TestQueryClientProvider>
        <Router history={history}>
          <Route>
            <MailchimpOAuthSuccess />
          </Route>
        </Router>
      </TestQueryClientProvider>
    )
  };
}

describe('MailchimpOAuthSuccess', () => {
  const axiosMock = new MockAdapter(Axios);
  const useAlertMock = jest.mocked(useAlert);
  const useConnectMailchimpMock = jest.mocked(useConnectMailchimp);

  beforeEach(() => {
    axiosMock.onPost(MAILCHIMP_OAUTH_SUCCESS).reply(200);
    useConnectMailchimpMock.mockReturnValue(mockUseConnectMailchimpResult);
  });

  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  it('makes a POST request to update the Mailchimp code', async () => {
    tree();
    await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
    expect(axiosMock.history.post[0]).toEqual(
      expect.objectContaining({
        data: JSON.stringify({
          mailchimp_oauth_code: 'mock-mailchimp-code',
          revenue_program: 'mock-rp-id'
        }),
        url: MAILCHIMP_OAUTH_SUCCESS
      })
    );
  });

  describe('When the POST to update the Mailchimp code succeeds', () => {
    it('redirects to /pages/', async () => {
      const { history } = tree();

      await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
      expect(history.location.pathname).toBe(SETTINGS.INTEGRATIONS);
    });

    it('sets the Mailchimp status refetch interval to 10 seconds', async () => {
      const setRefetchInterval = jest.fn();

      useConnectMailchimpMock.mockReturnValue({ ...mockUseConnectMailchimpResult, setRefetchInterval });
      tree();
      expect(setRefetchInterval).not.toBeCalled();
      await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
      expect(setRefetchInterval.mock.calls).toEqual([[10000]]);
    });
  });

  describe('When the POST to update the Mailchimp code fails', () => {
    // Silence noisy errors to make test output easier to read.

    let errorSpy: jest.SpyInstance;
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
      axiosMock.onPost(MAILCHIMP_OAUTH_SUCCESS).networkError();
      errorSpy = jest.spyOn(console, 'error').mockReturnValue();
      logSpy = jest.spyOn(console, 'log').mockReturnValue();
    });

    afterEach(() => {
      errorSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('shows a generic error', async () => {
      const error = jest.fn();

      useAlertMock.mockReturnValue({ error } as any);
      tree([`/${MAILCHIMP_OAUTH_SUCCESS_ROUTE}?code=mock-mailchimp-code`]);
      await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
      expect(error.mock.calls).toEqual([[GENERIC_ERROR]]);
    });

    it('does not reset the Mailchimp status refetch interval', async () => {
      const setRefetchInterval = jest.fn();

      useConnectMailchimpMock.mockReturnValue({ ...mockUseConnectMailchimpResult, setRefetchInterval });
      tree();
      await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
      expect(setRefetchInterval).not.toBeCalled();
    });
  });

  it('renders GlobalLoading', () => {
    tree();
    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
  });
});
