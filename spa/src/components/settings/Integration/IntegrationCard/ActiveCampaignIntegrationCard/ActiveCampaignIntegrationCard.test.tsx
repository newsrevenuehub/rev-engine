import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import { useConnectActiveCampaign } from 'hooks/useConnectActiveCampaign';
import useUser from 'hooks/useUser';
import ActiveCampaignIntegrationCard from './ActiveCampaignIntegrationCard';
import { SETTINGS } from 'routes';
import { ACTIVECAMPAIGN_HOME_URL } from 'constants/helperUrls';

jest.mock('hooks/useConnectActiveCampaign');
jest.mock('hooks/useUser');

const mockActiveCampaignData = {
  activecampaign_integration_connected: false,
  activecampaign_server_url: 'unused',
  id: 'mock-rp-id',
  name: 'mock-rp-name',
  slug: 'mock-rp-slug'
};
const mockUser = {
  organizations: [
    {
      plan: {
        name: 'FREE',
        label: 'Free'
      }
    }
  ]
};

function tree() {
  return render(<ActiveCampaignIntegrationCard />);
}

describe('ActiveCampaignIntegrationCard', () => {
  const useConnectActiveCampaignMock = jest.mocked(useConnectActiveCampaign);
  const useUserMock = jest.mocked(useUser);

  beforeEach(() => {
    useConnectActiveCampaignMock.mockReturnValue({
      ...mockActiveCampaignData,
      isError: false,
      isLoading: false,
      updateAccessTokenAndServerUrl: jest.fn()
    });
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
      user: mockUser as any
    });
  });

  it('shows an integration card named ActiveCampaign', () => {
    tree();
    expect(screen.getByText('ActiveCampaign')).toBeVisible();
  });

  it("shows a link to ActiveCampaign's web site", () => {
    tree();
    expect(screen.getByRole('link', { name: 'activecampaign.com' })).toHaveAttribute('href', ACTIVECAMPAIGN_HOME_URL);
  });

  it.each([
    ['connected', true],
    ['unconnected', false]
  ])(
    'shows a checkbox with appropriate state when the integration is %s',
    (_, activecampaign_integration_connected) => {
      useConnectActiveCampaignMock.mockReturnValue({
        ...mockActiveCampaignData,
        activecampaign_integration_connected,
        isError: false,
        isLoading: false,
        updateAccessTokenAndServerUrl: jest.fn()
      });
      tree();

      const checkbox = screen.getByRole('checkbox', { checked: activecampaign_integration_connected });

      expect(checkbox).toBeInTheDocument();
      expect(screen.getByText(activecampaign_integration_connected ? 'Connected' : 'Not Connected')).toBeVisible();
    }
  );

  it("doesn't show the modal by default", () => {
    tree();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a modal if the View Details button is clicked', () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('ActiveCampaign Integration');
  });

  it('closes the modal if the modal requests it', () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe("When the user's organization is on the FREE plan", () => {
    beforeEach(() => {
      useUserMock.mockReturnValue({
        user: {
          ...mockUser,
          organizations: [
            {
              plan: {
                name: 'FREE'
              }
            }
          ]
        }
      } as any);
    });

    it('shows a Core Feature badge', () => {
      tree();
      expect(screen.getByText('Core Feature')).toBeVisible();
    });

    it('shows an Upgrade button that goes to the subscription settings route', () => {
      tree();
      expect(screen.getByRole('button', { name: 'Upgrade' })).toHaveAttribute('href', SETTINGS.SUBSCRIPTION);
    });

    it('disables the checkbox', () => {
      tree();
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });
  });

  describe.each([['CORE'], ['PLUS']])("When the user's organization is on the %s plan", (name) => {
    beforeEach(() => {
      useUserMock.mockReturnValue({
        user: {
          ...mockUser,
          organizations: [
            {
              plan: { name }
            }
          ]
        }
      } as any);
    });

    it("doesn't show a Core Feature badge", () => {
      tree();
      expect(screen.queryByText('Core Feature')).not.toBeInTheDocument();
    });

    it("doesn't show an Upgrade button", () => {
      tree();
      expect(screen.queryByRole('button', { name: 'Upgrade' })).not.toBeInTheDocument();
    });

    it("enables the checkbox if the integration hasn't been set up yet", () => {
      tree();
      expect(screen.getByRole('checkbox')).toBeEnabled();
    });

    it('disables the checkbox if the integration has been set up', () => {
      useConnectActiveCampaignMock.mockReturnValue({
        ...mockActiveCampaignData,
        activecampaign_integration_connected: true,
        isError: false,
        isLoading: false,
        updateAccessTokenAndServerUrl: jest.fn()
      });

      tree();
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('shows the connection modal when the checkbox is checked', () => {
      tree();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('checkbox'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('shows the connection modal if the details modal requests it', () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'View Details' }));
      expect(screen.getByRole('dialog')).toHaveAccessibleName('ActiveCampaign Integration');
      fireEvent.click(screen.getByRole('button', { name: 'Start Connection' }));
      expect(screen.getByRole('dialog')).toHaveAccessibleName('ActiveCampaign Connection');
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
