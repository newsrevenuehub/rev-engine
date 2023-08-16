import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { USER_ROLE_HUB_ADMIN_TYPE, USER_ROLE_ORG_ADMIN_TYPE } from 'constants/authConstants';
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import useUser from 'hooks/useUser';
import hasContributionsSectionAccess from 'utilities/hasContributionsSectionAccess';
import DashboardSidebar from './DashboardSidebar';

jest.mock('components/common/OrganizationMenu/OrganizationMenu');
jest.mock('hooks/useUser');
jest.mock('utilities/hasContributionsSectionAccess');
jest.mock('./DashboardSidebarFooter');
jest.mock('./navs/ContentSectionNav');
jest.mock('./navs/ContributionSectionNav');

const user = {
  flags: [],
  organizations: [{ name: 'mock-rp-name', plan: { name: 'FREE' } }],
  role_type: [USER_ROLE_ORG_ADMIN_TYPE]
};

function tree() {
  return render(<DashboardSidebar />);
}

describe('DashboardSidebar', () => {
  const hasContributionsDashboardAccessToUserMock = jest.mocked(hasContributionsSectionAccess);
  const useUserMock = jest.mocked(useUser);

  beforeEach(() => {
    hasContributionsDashboardAccessToUserMock.mockReturnValue(true);
    useUserMock.mockReturnValue({ user } as any);
  });

  it('displays the Rev Engine logo', () => {
    tree();
    expect(screen.getByRole('img', { name: 'News Revenue Engine' })).toBeVisible();
  });

  it('shows a plan badge if the user is not a Hub admin', () => {
    useUserMock.mockReturnValue({ user: { ...user, role_type: [USER_ROLE_ORG_ADMIN_TYPE] } } as any);
    tree();
    expect(screen.getByTestId('engine-plan-badge')).toBeInTheDocument();
  });

  it('hides the plan badge if the user is a Hub admin', () => {
    useUserMock.mockReturnValue({ user: { ...user, role_type: [USER_ROLE_HUB_ADMIN_TYPE] } } as any);
    tree();
    expect(screen.queryByTestId('engine-plan-badge')).not.toBeInTheDocument();
  });

  it('shows an admin badge if the user is a Hub admin', () => {
    useUserMock.mockReturnValue({ user: { ...user, role_type: [USER_ROLE_HUB_ADMIN_TYPE] } } as any);
    tree();
    expect(screen.getByTestId('admin-badge')).toBeInTheDocument();
  });

  it('hides the admin badge if the user is not a Hub admin', () => {
    useUserMock.mockReturnValue({ user: { ...user, role_type: [USER_ROLE_ORG_ADMIN_TYPE] } } as any);
    tree();
    expect(screen.queryByTestId('admin-plan-badge')).not.toBeInTheDocument();
  });

  it('displays an organization menu if the user has only one', () => {
    useUserMock.mockReturnValue({
      user: { ...user, organizations: [{ name: 'test-org-name', plan: { name: 'FREE' } }] }
    } as any);
    tree();
    expect(screen.getByTestId('mock-organization-menu')).toHaveTextContent('test-org-name');
  });

  it("doesn't display an organization menu if the user has more than one", () => {
    useUserMock.mockReturnValue({
      user: { ...user, organizations: [{ name: 'test-org-name', plan: { name: 'FREE' } }, { name: 'test-org-name-2' }] }
    } as any);
    tree();
    expect(screen.queryByTestId('mock-organization-menu')).not.toBeInTheDocument();
  });

  it("doesn't display an organization menu if the user has none", () => {
    useUserMock.mockReturnValue({ user: { ...user, organizations: [] } } as any);
    tree();
    expect(screen.queryByTestId('mock-organization-menu')).not.toBeInTheDocument();
  });

  it('displays the content section navigation if the user has the matching feature flag', () => {
    useUserMock.mockReturnValue({
      user: { flags: [{ name: CONTENT_SECTION_ACCESS_FLAG_NAME }] }
    } as any);
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
