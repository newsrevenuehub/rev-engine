import useUser from 'hooks/useUser';
import { render, screen } from 'test-utils';
import CustomIntegrationCard from './CustomIntegrationCard';

jest.mock('../IntegrationCard');
jest.mock('hooks/useUser');

const defaultProps = {
  image: 'logo.png',
  title: 'digestbuilder',
  site: {
    label: 'digestbuilder.com',
    url: 'https://www.digestbuilder.com'
  },
  toggleLabelOverride: undefined,
  toggleTooltipMessageOverride: undefined,
  description: 'Connect payments made from DigestBuilder to RevEngine.',
  flag: 'show_connected_to_digestbuilder' as const
};

describe('CustomIntegrationCard', () => {
  const useUserMock = jest.mocked(useUser);
  function tree() {
    return render(<CustomIntegrationCard {...defaultProps} />);
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

  it('renders correct card type', () => {
    tree();

    expect(screen.getByTestId('title')).toHaveTextContent(defaultProps.title);
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
            [defaultProps.flag]: true
          }
        ]
      } as any
    });
    tree();

    expect(screen.getByTestId('isActive')).toHaveTextContent('true');
  });

  it('renders not connected integration card', () => {
    tree();

    expect(screen.getByTestId('isActive')).toHaveTextContent('false');
    expect(screen.getByRole('button', { name: 'connect' })).toBeDisabled();
  });
});
