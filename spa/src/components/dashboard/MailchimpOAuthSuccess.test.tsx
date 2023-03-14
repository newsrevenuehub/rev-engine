// Avoiding our own test-utils so we can create a custom render context without
// the normal BrowserRouter.
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory, InitialEntry } from 'history';
import useUserImport from 'hooks/useUser';
import { Route, Router } from 'react-router-dom';
import { CONTENT_SLUG, MAILCHIMP_OAUTH_SUCCESS_ROUTE } from 'routes';
import MailchimpOAuthSuccess from './MailchimpOAuthSuccess';

jest.mock('elements/GlobalLoading');
jest.mock('hooks/useUser');
jest.mock('react-alert');
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useMutation: jest.fn()
}));

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
  const mutate = jest.fn();
  const useUserMock = useUserImport as jest.Mock;
  const useMutationMock = useMutation as jest.Mock;

  beforeEach(() => {
    useMutationMock.mockReturnValue({
      mutate,
      isLoading: false,
      isError: false
    });
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

  it('call postMailchimpOAuthSuccess with correct params', () => {
    tree([`${MAILCHIMP_OAUTH_SUCCESS_ROUTE}?code=mock-mailchimp-code`]);

    expect(mutate).toBeCalledWith({ mailchimpCode: 'mock-mailchimp-code', rpId: 'mock-rp-id' });
  });

  it('redirect to /pages/ after successful mailchimp code update to the BE', () => {
    const { history } = tree([`${MAILCHIMP_OAUTH_SUCCESS_ROUTE}?code=mock-mailchimp-code`]);

    expect(mutate).toBeCalledTimes(1);
    expect(history.location.pathname).toBe(CONTENT_SLUG);
  });

  it('renders GlobalLoading', () => {
    tree(['mock']);

    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
  });
});
