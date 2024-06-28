import useUser from 'hooks/useUser';
import { render, screen } from 'test-utils';
import CustomIntegrationCard, { CustomIntegrationCardProps } from './CustomIntegrationCard';

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
  function tree(props?: Partial<CustomIntegrationCardProps>) {
    return render(<CustomIntegrationCard {...defaultProps} {...props} />);
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

  describe('toggle label', () => {
    it('renders default if no override is passed', () => {
      tree();
      expect(screen.getByTestId('toggleLabel')).toHaveTextContent('Contact Support to Connect');
    });

    it('renders override if defined', () => {
      tree({ toggleLabelOverride: 'Override' });
      expect(screen.getByTestId('toggleLabel')).toHaveTextContent('Override');
    });
  });

  describe('toggle tooltip message', () => {
    it('renders default if no override is passed', () => {
      tree();
      expect(screen.getByTestId('toggleTooltipMessage')).toHaveTextContent(
        `Contact our Support Staff to integrate with ${defaultProps.title}`
      );
    });

    it('renders override if defined', () => {
      tree({ toggleTooltipMessageOverride: 'Override' });
      expect(screen.getByTestId('toggleTooltipMessage')).toHaveTextContent('Override');
    });
  });

  describe('when user is loading', () => {
    it('renders "isActive" as false', () => {
      useUserMock.mockReturnValue({
        isLoading: true,
        isError: false,
        refetch: jest.fn(),
        user: undefined
      });
      tree();

      expect(screen.getByTestId('isActive')).toHaveTextContent('false');
    });
  });

  describe('when user returns error', () => {
    it('renders "isActive" as false', () => {
      useUserMock.mockReturnValue({
        isLoading: false,
        isError: true,
        refetch: jest.fn(),
        user: undefined
      });
      tree();

      expect(screen.getByTestId('isActive')).toHaveTextContent('false');
    });
  });
});
