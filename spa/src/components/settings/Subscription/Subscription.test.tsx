import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Subscription from './Subscription';
import useUser from 'hooks/useUser';
import { PLAN_LABELS } from 'constants/orgPlanConstants';
import { HELP_URL, PRICING_URL } from 'constants/helperUrls';

jest.mock('hooks/useUser');

function tree() {
  return render(<Subscription />);
}

describe('Subscription', () => {
  const useUserMock = jest.mocked(useUser);

  beforeEach(() => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
      setRefetchInterval: jest.fn(),
      user: { organizations: [{ plan: { name: PLAN_LABELS.FREE } }, { plan: { name: PLAN_LABELS.CORE } }] } as any
    });
  });

  it('displays nothing if the user is not available in context', () => {
    useUserMock.mockReturnValue({ isError: false, isLoading: true, refetch: jest.fn(), setRefetchInterval: jest.fn() });
    tree();
    expect(document.body.textContent).toBe('');
  });

  it("displays the plan the user's first organization has", () => {
    tree();
    expect(screen.getByText('Free Tier')).toBeVisible();
  });

  it('displays a link for a pricing comparison', () => {
    tree();

    const link = screen.getByRole('link', { name: 'View full pricing comparison' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', PRICING_URL);
  });

  it('displays a link for help with downgrading or cancelling an account', () => {
    tree();

    const link = screen.getByRole('link', { name: 'Support' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', HELP_URL);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
