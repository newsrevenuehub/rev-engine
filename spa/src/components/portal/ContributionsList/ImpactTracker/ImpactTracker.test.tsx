import { usePortalContributorImpact } from 'hooks/usePortalContributorImpact';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ImpactTracker from './ImpactTracker';

jest.mock('hooks/usePortalContributorImpact');

function tree() {
  return render(<ImpactTracker contributorId={'mock-id' as any} />);
}

describe('ImpactTracker', () => {
  const usePortalContributorImpactMock = jest.mocked(usePortalContributorImpact);

  beforeEach(() => {
    usePortalContributorImpactMock.mockReturnValue({
      impact: { total: 123000 } as any,
      isLoading: false,
      isError: false
    });
  });

  it('hides Impact Tracker when impact is loading', () => {
    usePortalContributorImpactMock.mockReturnValue({ isLoading: true } as any);
    tree();
    expect(screen.queryByText('Impact Tracker')).not.toBeInTheDocument();
    expect(screen.queryByText('Contributed to Date')).not.toBeInTheDocument();
  });

  it('shows the title', () => {
    tree();
    expect(screen.getByText('Impact Tracker')).toBeVisible();
    expect(screen.getByText('Contributed to Date')).toBeVisible();
  });

  it('shows the total amount', () => {
    tree();
    expect(screen.getByText('$1,230.00')).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
