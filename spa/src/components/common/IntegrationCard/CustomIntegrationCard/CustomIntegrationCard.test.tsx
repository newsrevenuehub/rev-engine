import { render, screen } from 'test-utils';
import CustomIntegrationCard, { CustomIntegrationCardProps, CARD_TYPES } from './CustomIntegrationCard';
import useUser from 'hooks/useUser';

jest.mock('../IntegrationCard');
jest.mock('hooks/useUser');

describe('CustomIntegrationCard', () => {
  const useUserMock = jest.mocked(useUser);
  function tree(type: CustomIntegrationCardProps['type']) {
    return render(<CustomIntegrationCard type={type} />);
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

  describe.each([
    'digestbuilder',
    'eventbrite',
    'newspack',
    'ga',
    'salesforce'
  ] as CustomIntegrationCardProps['type'][])('%s', (type) => {
    const cardType = CARD_TYPES[type];

    it('renders integration card', () => {
      tree(type);
      expect(screen.getByTestId('mock-integration-card')).toBeVisible();
    });

    it('renders correct card type', () => {
      tree(type);

      expect(screen.getByTestId('title')).toHaveTextContent(cardType.title);
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
              [cardType.flag]: true
            }
          ]
        } as any
      });
      tree(type);

      expect(screen.getByTestId('isActive')).toHaveTextContent('true');
    });

    it('renders not connected integration card', () => {
      tree(type);

      expect(screen.getByTestId('isActive')).toHaveTextContent('false');
      expect(screen.getByRole('button', { name: 'connect' })).toBeDisabled();
    });
  });
});
