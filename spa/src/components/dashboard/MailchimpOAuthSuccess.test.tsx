// Avoiding our own test-utils so we can create a custom render context without
// the normal BrowserRouter.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import Axios from 'ajax/axios';
import { MAILCHIMP_OAUTH_SUCCESS } from 'ajax/endpoints';
import MockAdapter from 'axios-mock-adapter';
import { GENERIC_ERROR } from 'constants/textConstants';
import { createMemoryHistory, InitialEntry } from 'history';
import useUserImport from 'hooks/useUser';
import { useAlert } from 'react-alert';
import { Route, Router } from 'react-router-dom';
import { MAILCHIMP_OAUTH_SUCCESS_ROUTE, SETTINGS } from 'routes';
import MailchimpOAuthSuccess from './MailchimpOAuthSuccess';

jest.mock('elements/GlobalLoading');
jest.mock('hooks/useUser');
jest.mock('react-alert');

const queryClient = new QueryClient();

function tree(initialEntries?: InitialEntry[]) {
  const history = createMemoryHistory({ initialEntries });

  return {
    history,
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route>
            <MailchimpOAuthSuccess />
          </Route>
        </Router>
      </QueryClientProvider>
    )
  };
}

describe('MailchimpOAuthSuccess', () => {
  const axiosMock = new MockAdapter(Axios);
  const useAlertMock = useAlert as jest.Mock;
  const useUserMock = useUserImport as jest.Mock;

  beforeEach(() => {
    useUserMock.mockReturnValue({
      user: {
        revenue_programs: [
          {
            id: 'mock-rp-id'
          }
        ]
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn()
    });
  });

  afterEach(() => axiosMock.reset());

  afterAll(() => axiosMock.restore());

  it('render component with correct pathname and search argument', () => {
    useUserMock.mockReturnValue({
      isLoading: true,
      isError: false,
      refetch: jest.fn()
    });
    const { history } = tree([`${MAILCHIMP_OAUTH_SUCCESS_ROUTE}?code=mock-mailchimp-code`]);

    expect(history.location.pathname).toBe(MAILCHIMP_OAUTH_SUCCESS_ROUTE);
    expect(history.location.search).toBe('?code=mock-mailchimp-code');
  });

  it('call axios with correct params', async () => {
    tree([`${MAILCHIMP_OAUTH_SUCCESS_ROUTE}?code=mock-mailchimp-code`]);

    await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
    console.log(axiosMock.history);
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

  it('show generic error if mutation fails and calls onError', async () => {
    const error = jest.fn();
    useAlertMock.mockReturnValue({ error });
    axiosMock.onPost().networkError();
    tree([`${MAILCHIMP_OAUTH_SUCCESS_ROUTE}?code=mock-mailchimp-code`]);

    await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
    expect(error).toBeCalledTimes(1);
    expect(error).toBeCalledWith(GENERIC_ERROR);
  });

  it('redirect to /pages/ after successful mailchimp code update to the BE', async () => {
    axiosMock.onPost(MAILCHIMP_OAUTH_SUCCESS).reply(200);
    const { history } = tree([`${MAILCHIMP_OAUTH_SUCCESS_ROUTE}?code=mock-mailchimp-code`]);

    await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
    expect(history.location.pathname).toBe(SETTINGS.INTEGRATIONS);
  });

  it('renders GlobalLoading', () => {
    tree(['mock']);

    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
  });
});
