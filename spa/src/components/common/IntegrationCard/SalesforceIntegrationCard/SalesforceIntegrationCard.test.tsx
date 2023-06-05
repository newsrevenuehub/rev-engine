import { render, screen } from 'test-utils';
import SalesforceIntegrationCard from './SalesforceIntegrationCard';
import useUser from 'hooks/useUser';

jest.mock('../IntegrationCard');
jest.mock('hooks/useUser');

describe('SalesforceIntegrationCard', () => {
  const useUserMock = jest.mocked(useUser);
  function tree() {
    return render(<SalesforceIntegrationCard />);
  }

  beforeEach(() => {
    useUserMock.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      setRefetchInterval: jest.fn(),
      user: {
        organizations: [
          {
            id: 'mock-org'
          }
        ]
      } as any
    });
  });

  it('renders integration card', () => {
    tree();
    expect(screen.getByTestId('mock-integration-card')).toBeVisible();
  });

  it('renders connected integration card', () => {
    useUserMock.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      setRefetchInterval: jest.fn(),
      user: {
        organizations: [
          {
            id: 'mock-org',
            show_connected_to_salesforce: true
          }
        ]
      } as any
    });
    tree();

    expect(screen.getByTestId('isActive')).toHaveTextContent('true');
  });

  it('renders not connected integration card', () => {
    tree();

    expect(screen.getByTestId('cornerMessage')).toHaveTextContent('Contact Support');
    expect(screen.getByTestId('isActive')).toHaveTextContent('false');
    expect(screen.getByRole('button', { name: 'connect' })).toBeDisabled();
  });
});
