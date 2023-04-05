import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import useFeatureFlags from 'hooks/useFeatureFlags';
import useUser from 'hooks/useUser';
import hasContributionsDashboardAccessToUser from 'utilities/hasContributionsDashboardAccessToUser';
import DashboardSidebar from './DashboardSidebar';

jest.mock('components/common/OrganizationMenu/OrganizationMenu');
jest.mock('hooks/useFeatureFlags');
jest.mock('hooks/useUser');
jest.mock('utilities/hasContributionsDashboardAccessToUser');
jest.mock('./DashboardSidebarFooter');
jest.mock('./navs/ContentSectionNav');
jest.mock('./navs/ContributionSectionNav');

function tree() {
  return render(<DashboardSidebar />);
}

describe('DashboardSidebar', () => {
  const hasContributionsDashboardAccessToUserMock = jest.mocked(hasContributionsDashboardAccessToUser);
  const useFeatureFlagsMock = jest.mocked(useFeatureFlags);
  const useUserMock = jest.mocked(useUser);

  beforeEach(() => {
    hasContributionsDashboardAccessToUserMock.mockReturnValue(true);
    useFeatureFlagsMock.mockReturnValue({ isError: false, isLoading: false, flags: [] });
    useUserMock.mockReturnValue({ user: { organizations: [] } } as any);
  });

  it('displays the Rev Engine logo', () => {
    tree();
    expect(screen.getByRole('img', { name: 'News Revenue Engine' })).toBeVisible();
  });

  it('displays an organization menu if the user has only one', () => {
    useUserMock.mockReturnValue({ user: { organizations: [{ name: 'test-org-name' }] } } as any);
    tree();
    expect(screen.getByTestId('mock-organization-menu')).toHaveTextContent('test-org-name');
  });

  it("doesn't display an organization menu if the user has more than one", () => {
    useUserMock.mockReturnValue({
      user: { organizations: [{ name: 'test-org-name' }, { name: 'test-org-name-2' }] }
    } as any);
    tree();
    expect(screen.queryByTestId('mock-organization-menu')).not.toBeInTheDocument();
  });

  it("doesn't display an organization menu if the user has none", () => {
    useUserMock.mockReturnValue({ user: { organizations: [] } } as any);
    tree();
    expect(screen.queryByTestId('mock-organization-menu')).not.toBeInTheDocument();
  });

  it('displays the content section navigation if the user has the matching feature flag', () => {
    useFeatureFlagsMock.mockReturnValue({
      isError: false,
      isLoading: false,
      flags: [{ name: CONTENT_SECTION_ACCESS_FLAG_NAME }]
    });
    tree();
    expect(screen.getByTestId('mock-content-section-nav')).toBeInTheDocument();
  });

  it("doesn't display the content section navigation if the user has that feature flag", () => {
    tree();
    expect(screen.queryByTestId('mock-content-section-nav')).not.toBeInTheDocument();
  });

  it('displays the contributions section nav if the user has access to contributions', () => {
    hasContributionsDashboardAccessToUserMock.mockReturnValue(true);
    tree();
    expect(screen.getByTestId('mock-contribution-section-nav')).toBeInTheDocument();
  });

  it("doesn't display the contributions section nav if the user doesn't have access to contributions", () => {
    hasContributionsDashboardAccessToUserMock.mockReturnValue(false);
    tree();
    expect(screen.queryByTestId('mock-contribution-section-nav')).not.toBeInTheDocument();
  });

  it('displays the sidebar footer', () => {
    tree();
    expect(screen.getByTestId('mock-dashboard-sidebar-footer')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
