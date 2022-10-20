import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import useSubdomain from 'hooks/useSubdomain';
import ContributorDashboard from './ContributorDashboard';
import { useConfigureAnalytics } from 'components/analytics';
import userEvent from '@testing-library/user-event';

jest.mock('components/analytics');
jest.mock('hooks/useSubdomain');
jest.mock('./ContributionsTable');
jest.mock('./ContributorTokenExpiredModal');

function tree() {
  return render(<ContributorDashboard />);
}

describe('ContributorDashboard', () => {
  const useConfigureAnalyticsMock = useConfigureAnalytics as jest.Mock;
  const useSubdomainMock = useSubdomain as jest.Mock;

  beforeEach(() => useSubdomainMock.mockReturnValue('mock-subdomain'));

  it('configures analytics', () => {
    tree();
    expect(useConfigureAnalyticsMock).toBeCalledTimes(1);
  });

  it('displays a heading', () => {
    tree();
    expect(screen.getByRole('heading', { name: 'Your Contributions' })).toBeVisible();
  });

  it('displays explanatory text', () => {
    tree();
    expect(screen.getByText('Changes made may not be reflected immediately.')).toBeVisible();
  });

  it('displays a contributions table using the subdomain as the revenue program slug', () => {
    useSubdomainMock.mockReturnValue('test-subdomain');
    tree();

    const table = screen.getByTestId('mock-contributions-table');

    expect(table).toBeVisible();
    expect(table).toHaveAttribute('data-rp-slug', 'test-subdomain');
  });

  it('shows a token expiration dialog if a child signals the token has expired', () => {
    tree();
    expect(screen.queryByTestId('mock-contributor-token-expired-modal')).not.toBeInTheDocument();
    userEvent.click(screen.getByText('setTokenExpired'));

    const modal = screen.getByTestId('mock-contributor-token-expired-modal');

    expect(modal).toHaveAttribute('data-is-open', 'true');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
