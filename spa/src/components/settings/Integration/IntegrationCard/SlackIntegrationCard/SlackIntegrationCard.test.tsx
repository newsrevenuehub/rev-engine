import useUser from 'hooks/useUser';
import { render, screen } from 'test-utils';
import SlackIntegrationCard from './SlackIntegrationCard';

jest.mock('../IntegrationCard');
jest.mock('hooks/useUser');

describe('SlackIntegrationCard', () => {
  const useUserMock = jest.mocked(useUser);
  function tree() {
    return render(<SlackIntegrationCard />);
  }

  beforeEach(() => {
    useUserMock.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
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
      user: {
        organizations: [
          {
            id: 'mock-org',
            show_connected_to_slack: true
          }
        ]
      } as any
    });
    tree();

    expect(screen.getByTestId('isActive')).toHaveTextContent('true');
  });

  it('renders not connected integration card', () => {
    tree();

    expect(screen.getByTestId('cornerMessage')).toHaveTextContent('');
    expect(screen.getByTestId('isActive')).toHaveTextContent('false');
    expect(screen.getByRole('button', { name: 'connect' })).toBeDisabled();
  });

  it('should have correct connected tooltip message', async () => {
    tree();

    expect(screen.getByTestId('toggleConnectedTooltipMessage')).toHaveTextContent(
      'Connected to Slack. Contact Support to disconnect.'
    );
  });
});
