import { axe } from 'jest-axe';
import useContributionPageList from 'hooks/useContributionPageList';
import useUser from 'hooks/useUser';
import { render } from 'test-utils';
import PageUsage, { PageUsageProps } from './PageUsage';
import { USER_ROLE_HUB_ADMIN_TYPE, USER_ROLE_ORG_ADMIN_TYPE, USER_SUPERUSER_TYPE } from 'constants/authConstants';
import { PLAN_NAMES } from 'constants/orgPlanConstants';

jest.mock('hooks/useContributionPageList');
jest.mock('hooks/useUser');

function tree(props?: Partial<PageUsageProps>) {
  return render(<PageUsage {...props} />);
}

describe('PageUsage', () => {
  const useContributionPageListMock = useContributionPageList as jest.Mock;
  const useUserMock = useUser as jest.Mock;

  beforeEach(() => {
    useContributionPageListMock.mockReturnValue({ isError: false, isLoading: false, pages: [{ id: 'mock-page-1' }] });
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      user: { organizations: [{ plan: { page_limit: 10 } }], role_type: ['mock-role'] }
    });
  });

  it('displays nothing while pages are loading', () => {
    useContributionPageListMock.mockReturnValue({ isLoading: true });
    tree();
    expect(document.body).toHaveTextContent('');
  });

  it('displays nothing while the user is loading', () => {
    useUserMock.mockReturnValue({ isLoading: true });
    tree();
    expect(document.body).toHaveTextContent('');
  });

  it('displays nothing if the user has no organizations', () => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      user: { organizations: [], role_type: ['mock-role'] }
    });
    tree();
    expect(document.body).toHaveTextContent('');
  });

  it('shows a page count only if the user is a Hub admin', () => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      user: { organizations: [{ plan: { page_limit: 10 } }], role_type: [USER_ROLE_HUB_ADMIN_TYPE] }
    });
    tree();
    expect(document.body).toHaveTextContent('1 page');
  });

  it('shows a page count only if the user is a superuser', () => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      user: { organizations: [{ plan: { page_limit: 10 } }], role_type: [USER_SUPERUSER_TYPE] }
    });
    tree();
    expect(document.body).toHaveTextContent('1 page');
  });

  it("shows a page count only if the user's organization is on the Plus plan", () => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      user: {
        organizations: [{ plan: { name: PLAN_NAMES.PLUS, page_limit: 10 } }],
        role_type: [USER_ROLE_ORG_ADMIN_TYPE]
      }
    });
    tree();
    expect(document.body).toHaveTextContent('1 page');
  });

  it('shows a page and limit if the user is on the Free plan', () => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      user: {
        organizations: [{ plan: { name: PLAN_NAMES.FREE, page_limit: 10 } }],
        role_type: [USER_ROLE_ORG_ADMIN_TYPE]
      }
    });
    tree();
    expect(document.body).toHaveTextContent('1 of 10 pages');
  });

  it('shows a page and limit if the user is on the Core plan', () => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      user: {
        organizations: [{ plan: { name: PLAN_NAMES.CORE, page_limit: 1 } }],
        role_type: [USER_ROLE_ORG_ADMIN_TYPE]
      }
    });
    tree();
    expect(document.body).toHaveTextContent('1 of 1 page');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
